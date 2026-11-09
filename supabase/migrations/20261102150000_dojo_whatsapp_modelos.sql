-- Mensagens de WhatsApp personalizáveis pelo dono do dojo.
-- templates: { "<categoria>": "<modelo com {variaveis}>" }; categoria ausente
-- usa o modelo padrão do app (sem links, com convite para abrir o app do aluno).
ALTER TABLE public.dojo_whatsapp_instances
  ADD COLUMN IF NOT EXISTS templates jsonb NOT NULL DEFAULT '{}'::jsonb;
