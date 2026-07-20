
CREATE TABLE public.dojo_gateway_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  action text NOT NULL,
  actor_user_id uuid,
  actor_email text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dojo_gw_history_owner ON public.dojo_gateway_history(owner_id, created_at DESC);
GRANT SELECT, INSERT ON public.dojo_gateway_history TO authenticated;
GRANT ALL ON public.dojo_gateway_history TO service_role;
ALTER TABLE public.dojo_gateway_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own gateway history" ON public.dojo_gateway_history
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner inserts own gateway history" ON public.dojo_gateway_history
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
