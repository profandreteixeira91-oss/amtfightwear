
CREATE TABLE public.order_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.store_orders(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_notifications_user_created_idx ON public.order_notifications (user_id, created_at DESC);
CREATE UNIQUE INDEX order_notifications_order_event_uq ON public.order_notifications (order_id, event) WHERE order_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_notifications TO authenticated;
GRANT ALL ON public.order_notifications TO service_role;
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.order_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.order_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.order_notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
