-- Adicionando campos para suportar recorrência de PIX e melhor gestão de cobrança
ALTER TABLE public.dojo_subscriptions 
  ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'card' CHECK (subscription_type IN ('card', 'pix')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS current_payment_status TEXT,
  ADD COLUMN IF NOT EXISTS last_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS last_copy_paste TEXT,
  ADD COLUMN IF NOT EXISTS next_due_date DATE,
  ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.dojo_subscriptions.subscription_type IS 'Tipo de assinatura: card (Preapproval MP) ou pix (recorrência interna)';
COMMENT ON COLUMN public.dojo_subscriptions.last_qr_code IS 'Base64 do QR Code para o pagamento PIX atual';
COMMENT ON COLUMN public.dojo_subscriptions.last_copy_paste IS 'Linha digitável do PIX atual';
