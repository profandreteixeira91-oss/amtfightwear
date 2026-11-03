-- Pedidos arquivados: saem da fila do /admin/pedidos (aba Arquivados) sem apagar nada.
-- Só pedidos com status 'completed' (Finalizado) são arquivados pelo painel.
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- A fila sempre lista os não arquivados, do mais recente para o mais antigo.
CREATE INDEX IF NOT EXISTS store_orders_fila_idx
  ON public.store_orders (created_at DESC)
  WHERE archived_at IS NULL;
