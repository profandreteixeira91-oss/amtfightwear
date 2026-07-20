
-- ====== EXTENDING dojo_plans WITH COMMERCIAL CONFIGURATION ======
ALTER TABLE public.dojo_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS enrollment_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS custom_months integer,
  ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Validation trigger: valid frequency + required custom_months when custom + at least one enabled pm
CREATE OR REPLACE FUNCTION public.dojo_plans_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  enabled_count int;
BEGIN
  IF NEW.frequency NOT IN ('monthly','bimonthly','quarterly','quadrimestral','semiannual','annual','custom') THEN
    RAISE EXCEPTION 'Frequência inválida: %', NEW.frequency;
  END IF;

  IF NEW.frequency = 'custom' AND (NEW.custom_months IS NULL OR NEW.custom_months < 1) THEN
    RAISE EXCEPTION 'Frequência personalizada exige custom_months >= 1';
  END IF;

  IF NEW.active THEN
    SELECT count(*) INTO enabled_count
    FROM jsonb_array_elements(NEW.payment_methods) e
    WHERE (e->>'enabled')::boolean IS TRUE;

    IF enabled_count = 0 THEN
      RAISE EXCEPTION 'Selecione ao menos uma forma de pagamento para este plano.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dojo_plans_validate_trg ON public.dojo_plans;
CREATE TRIGGER dojo_plans_validate_trg
  BEFORE INSERT OR UPDATE ON public.dojo_plans
  FOR EACH ROW EXECUTE FUNCTION public.dojo_plans_validate();
