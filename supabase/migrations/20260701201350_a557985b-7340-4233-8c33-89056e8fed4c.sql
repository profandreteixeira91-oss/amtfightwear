
-- Fix critical: meta_connections tokens exposed to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view meta connections" ON public.meta_connections;
CREATE POLICY "Users can view their own meta connections"
  ON public.meta_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix: activity_logs readable by all users
DROP POLICY IF EXISTS "Authenticated can read logs" ON public.activity_logs;
CREATE POLICY "Users can view their own logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
