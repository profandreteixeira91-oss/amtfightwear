-- Adicionar campo para ID de assinatura Pix do Mercado Pago se necessário
-- (A tabela dojo_subscriptions já possui campos genéricos para IDs do MP, mas vamos garantir flexibilidade)
ALTER TABLE public.dojo_subscriptions ADD COLUMN IF NOT EXISTS mp_pix_id text;
ALTER TABLE public.dojo_subscriptions ADD COLUMN IF NOT EXISTS mp_pix_qr_code text;
ALTER TABLE public.dojo_subscriptions ADD COLUMN IF NOT EXISTS mp_pix_qr_code_base64 text;
ALTER TABLE public.dojo_subscriptions ADD COLUMN IF NOT EXISTS mp_pix_ticket_url text;