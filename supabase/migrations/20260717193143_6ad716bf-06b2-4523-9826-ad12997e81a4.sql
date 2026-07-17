
CREATE TABLE public.store_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  path text,
  referrer text,
  user_agent text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX store_visits_created_at_idx ON public.store_visits (created_at DESC);
CREATE INDEX store_visits_session_idx ON public.store_visits (session_id, created_at);

GRANT SELECT, INSERT ON public.store_visits TO anon, authenticated;
GRANT ALL ON public.store_visits TO service_role;

ALTER TABLE public.store_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a visit" ON public.store_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view visits" ON public.store_visits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all customer profiles from the admin panel
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
