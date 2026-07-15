CREATE TABLE public.store_shipping_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  env text NOT NULL DEFAULT 'sandbox' CHECK (env IN ('sandbox','production')),
  origin_zip text NOT NULL DEFAULT '57940000',
  default_weight_kg numeric NOT NULL DEFAULT 0.5,
  default_length_cm integer NOT NULL DEFAULT 20,
  default_width_cm integer NOT NULL DEFAULT 15,
  default_height_cm integer NOT NULL DEFAULT 5,
  default_insurance_value numeric NOT NULL DEFAULT 0,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_shipping_settings TO authenticated;
GRANT ALL ON public.store_shipping_settings TO service_role;

ALTER TABLE public.store_shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read shipping settings"
  ON public.store_shipping_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can manage shipping settings"
  ON public.store_shipping_settings FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER store_shipping_settings_updated_at
  BEFORE UPDATE ON public.store_shipping_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.store_shipping_settings (env, origin_zip) VALUES ('sandbox', '57940000');