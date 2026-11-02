-- WhatsApp do Dojo Manager (Evolution API).
--
-- Cada dono conecta o próprio WhatsApp (instância na Evolution API, lendo o QR
-- Code no painel). As notificações que vão por push aos alunos também entram
-- numa fila de WhatsApp, enviada aos poucos pelo cron (até 25 por minuto por
-- academia) para não sobrecarregar o número do dono.
--
-- As duas tabelas são só do servidor (service role): o painel lê e grava por
-- server functions que conferem o dono. O token da instância e o segredo do
-- webhook nunca chegam ao navegador.

CREATE TABLE IF NOT EXISTS public.dojo_whatsapp_instances (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name text NOT NULL UNIQUE,
  instance_token text,
  webhook_secret text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connecting', 'connected')),
  phone_number text,
  profile_name text,
  enabled boolean NOT NULL DEFAULT true,
  -- categoria ausente = ligada (mesma regra das preferências de push)
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  last_status_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dojo_whatsapp_instances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dojo_whatsapp_instances FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.dojo_whatsapp_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.dojo_students(id) ON DELETE SET NULL,
  phone text NOT NULL,
  category text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS dojo_whatsapp_outbox_queue_idx
  ON public.dojo_whatsapp_outbox (next_attempt_at)
  WHERE status IN ('pending', 'sending');
CREATE INDEX IF NOT EXISTS dojo_whatsapp_outbox_owner_idx
  ON public.dojo_whatsapp_outbox (owner_id, created_at DESC);

ALTER TABLE public.dojo_whatsapp_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dojo_whatsapp_outbox FROM anon, authenticated;

-- Aluno (ou responsável) que respondeu SAIR não recebe mais mensagens.
ALTER TABLE public.dojo_students
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false;

-- Reserva o próximo lote da fila: até _limit_per_owner mensagens por academia,
-- sem disputar linhas com outra execução (SKIP LOCKED). Envios que ficaram
-- presos em 'sending' por mais de 5 minutos voltam (até 3 tentativas).
CREATE OR REPLACE FUNCTION public.dojo_whatsapp_claim(_limit_per_owner integer DEFAULT 25)
RETURNS SETOF public.dojo_whatsapp_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH ranked AS (
    SELECT o.id,
           row_number() OVER (PARTITION BY o.owner_id ORDER BY o.created_at) AS rn
      FROM public.dojo_whatsapp_outbox o
     WHERE (o.status = 'pending' AND o.next_attempt_at <= now())
        OR (o.status = 'sending' AND o.attempts < 3 AND o.next_attempt_at <= now() - interval '5 minutes')
  ),
  picked AS (
    SELECT o.id
      FROM public.dojo_whatsapp_outbox o
     WHERE o.id IN (SELECT id FROM ranked WHERE rn <= greatest(1, least(_limit_per_owner, 100)))
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.dojo_whatsapp_outbox o
     SET status = 'sending',
         attempts = o.attempts + 1,
         next_attempt_at = now()
    FROM picked
   WHERE o.id = picked.id
  RETURNING o.*;
$fn$;

REVOKE ALL ON FUNCTION public.dojo_whatsapp_claim(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dojo_whatsapp_claim(integer) TO service_role;

-- Envio da fila a cada minuto (usa dojo_hook_post da migration 20261102090000).
DO $do$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'dojo-whatsapp-dispatch';
  PERFORM cron.schedule('dojo-whatsapp-dispatch', '* * * * *', 'SELECT public.dojo_hook_post(''whatsapp-dispatch'');');
END
$do$;
