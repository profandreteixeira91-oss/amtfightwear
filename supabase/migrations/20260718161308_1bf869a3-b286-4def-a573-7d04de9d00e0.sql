-- 1) Add owner_id to all dojo_* domain tables
ALTER TABLE public.dojo_units ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_belts ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_plans ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_students ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_enrollments ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_invoices ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_graduations ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_certificates ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_certificate_templates ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dojo_expenses ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- attendance / partner tables (may or may not exist depending on phase 2 rollout)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_attendance') THEN
    EXECUTE 'ALTER TABLE public.dojo_attendance ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_partner_integrations') THEN
    EXECUTE 'ALTER TABLE public.dojo_partner_integrations ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_partner_checkins') THEN
    EXECUTE 'ALTER TABLE public.dojo_partner_checkins ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE';
  END IF;
END $$;

-- 2) Backfill existing rows to the current admin
UPDATE public.dojo_units SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_belts SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_plans SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_students SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_enrollments SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_invoices SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_graduations SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_certificates SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_certificate_templates SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;
UPDATE public.dojo_expenses SET owner_id = '8ea6d292-c6f3-4feb-b812-12232c82f52c' WHERE owner_id IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_attendance') THEN
    EXECUTE 'UPDATE public.dojo_attendance SET owner_id = ''8ea6d292-c6f3-4feb-b812-12232c82f52c'' WHERE owner_id IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_partner_integrations') THEN
    EXECUTE 'UPDATE public.dojo_partner_integrations SET owner_id = ''8ea6d292-c6f3-4feb-b812-12232c82f52c'' WHERE owner_id IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_partner_checkins') THEN
    EXECUTE 'UPDATE public.dojo_partner_checkins SET owner_id = ''8ea6d292-c6f3-4feb-b812-12232c82f52c'' WHERE owner_id IS NULL';
  END IF;
END $$;

-- Make owner_id NOT NULL
ALTER TABLE public.dojo_units ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_belts ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_plans ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_students ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_enrollments ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_invoices ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_graduations ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_certificates ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_certificate_templates ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.dojo_expenses ALTER COLUMN owner_id SET NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_attendance') THEN
    EXECUTE 'ALTER TABLE public.dojo_attendance ALTER COLUMN owner_id SET NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_partner_integrations') THEN
    EXECUTE 'ALTER TABLE public.dojo_partner_integrations ALTER COLUMN owner_id SET NOT NULL';
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_dojo_units_owner ON public.dojo_units(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_belts_owner ON public.dojo_belts(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_plans_owner ON public.dojo_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_students_owner ON public.dojo_students(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_enrollments_owner ON public.dojo_enrollments(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_invoices_owner ON public.dojo_invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_graduations_owner ON public.dojo_graduations(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_certificates_owner ON public.dojo_certificates(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_cert_tpl_owner ON public.dojo_certificate_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_expenses_owner ON public.dojo_expenses(owner_id);

-- 3) Replace admin-only policies with per-owner policies (keep admin bypass)
DO $$
DECLARE
  t text;
  pol record;
  owner_tables text[] := ARRAY[
    'dojo_units','dojo_belts','dojo_plans','dojo_students','dojo_enrollments',
    'dojo_invoices','dojo_graduations','dojo_certificates','dojo_certificate_templates',
    'dojo_expenses'
  ];
BEGIN
  -- optionally add attendance tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_attendance') THEN
    owner_tables := array_append(owner_tables, 'dojo_attendance');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_partner_integrations') THEN
    owner_tables := array_append(owner_tables, 'dojo_partner_integrations');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_partner_checkins') THEN
    owner_tables := array_append(owner_tables, 'dojo_partner_checkins');
  END IF;

  FOREACH t IN ARRAY owner_tables LOOP
    -- Drop all existing policies to rewrite cleanly
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Owner full access (or admin)
    EXECUTE format($f$
      CREATE POLICY "Owner manages %1$s" ON public.%1$I
        FOR ALL TO authenticated
        USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
        WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
    $f$, t);
  END LOOP;
END $$;

-- Re-add student self-read policies (they were dropped above)
CREATE POLICY "Students read own students" ON public.dojo_students
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Students read own enroll" ON public.dojo_enrollments
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = dojo_enrollments.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Students read own invoices" ON public.dojo_invoices
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = dojo_invoices.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Students read own grads" ON public.dojo_graduations
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = dojo_graduations.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Students read own certs" ON public.dojo_certificates
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = dojo_certificates.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Public verify cert" ON public.dojo_certificates
  FOR SELECT TO anon USING (true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dojo_attendance') THEN
    EXECUTE $p$CREATE POLICY "Students read own attendance" ON public.dojo_attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.dojo_students s WHERE s.id = dojo_attendance.student_id AND s.user_id = auth.uid()))$p$;
  END IF;
END $$;

-- Public anon read on certificates already re-added above; grant anon SELECT for verification page
GRANT SELECT ON public.dojo_certificates TO anon;

-- 4) Subscriptions table
CREATE TABLE IF NOT EXISTS public.dojo_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  mp_preapproval_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- pending | trialing | authorized | paused | cancelled | past_due
  plan_amount numeric(10,2) NOT NULL DEFAULT 59.90,
  currency text NOT NULL DEFAULT 'BRL',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  last_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_subscriptions TO authenticated;
GRANT ALL ON public.dojo_subscriptions TO service_role;

ALTER TABLE public.dojo_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own subscription" ON public.dojo_subscriptions
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner creates own subscription" ON public.dojo_subscriptions
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner updates own subscription" ON public.dojo_subscriptions
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_dojo_subs_status ON public.dojo_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_dojo_subs_mp ON public.dojo_subscriptions(mp_preapproval_id);

CREATE TRIGGER trg_dojo_subs_updated_at
  BEFORE UPDATE ON public.dojo_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Seed a "trialing" subscription for the current admin so nothing breaks
INSERT INTO public.dojo_subscriptions (owner_id, status, plan_amount, trial_ends_at, current_period_end)
VALUES ('8ea6d292-c6f3-4feb-b812-12232c82f52c', 'authorized', 59.90, NULL, now() + interval '100 years')
ON CONFLICT (owner_id) DO NOTHING;