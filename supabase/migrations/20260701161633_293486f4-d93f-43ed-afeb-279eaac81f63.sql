
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten app_settings write policies: require authenticated + record updater
DROP POLICY IF EXISTS "Authenticated can upsert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can update settings" ON public.app_settings;

CREATE POLICY "Authenticated can insert settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
