
-- 1) Templates: nullable owner + new columns + global read policy
ALTER TABLE public.dojo_contract_templates
  ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.dojo_contract_templates
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS variables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[];

DO $$ BEGIN
  ALTER TABLE public.dojo_contract_templates
    ADD CONSTRAINT dojo_contract_templates_category_check
    CHECK (category IN ('student','affiliate','teacher','employee','partnership','event','competition','lgpd','legal','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.dojo_contract_templates
    ADD CONSTRAINT dojo_contract_templates_status_check
    CHECK (status IN ('active','inactive','review','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Owner manages own contract templates" ON public.dojo_contract_templates;

CREATE POLICY "Read global or own templates"
  ON public.dojo_contract_templates FOR SELECT
  TO authenticated
  USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Owner writes own templates"
  ON public.dojo_contract_templates FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner updates own templates"
  ON public.dojo_contract_templates FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner deletes own templates"
  ON public.dojo_contract_templates FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 2) Student contracts — expand fields + status
ALTER TABLE public.dojo_student_contracts
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS template_version INTEGER,
  ADD COLUMN IF NOT EXISTS issued_by UUID,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.dojo_student_contracts DROP CONSTRAINT IF EXISTS dojo_student_contracts_status_check;
ALTER TABLE public.dojo_student_contracts
  ADD CONSTRAINT dojo_student_contracts_status_check
  CHECK (status IN ('draft','issued','sent','pending_signature','signed','refused','cancelled','expired','terminated','completed','active'));

CREATE INDEX IF NOT EXISTS idx_dojo_student_contracts_owner_status ON public.dojo_student_contracts(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_dojo_student_contracts_number ON public.dojo_student_contracts(owner_id, contract_number);

-- 3) Affiliate contracts — expand fields + status
ALTER TABLE public.dojo_affiliate_contracts
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS template_version INTEGER,
  ADD COLUMN IF NOT EXISTS issued_by UUID,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS header_html TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_html TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS page_size TEXT NOT NULL DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS page_orientation TEXT NOT NULL DEFAULT 'portrait',
  ADD COLUMN IF NOT EXISTS margin_mm INTEGER NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS show_page_numbers BOOLEAN NOT NULL DEFAULT true;

-- Rename column signature_status to status for symmetry? Keep as-is to avoid breakage; add generated view later.
CREATE INDEX IF NOT EXISTS idx_dojo_affiliate_contracts_owner ON public.dojo_affiliate_contracts(owner_id, signature_status);
CREATE INDEX IF NOT EXISTS idx_dojo_affiliate_contracts_number ON public.dojo_affiliate_contracts(owner_id, contract_number);

-- 4) Timeline / events table
CREATE TABLE IF NOT EXISTS public.dojo_contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  contract_kind TEXT NOT NULL CHECK (contract_kind IN ('student','affiliate')),
  contract_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_id UUID,
  note TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dojo_contract_events TO authenticated;
GRANT ALL ON public.dojo_contract_events TO service_role;

ALTER TABLE public.dojo_contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own contract events"
  ON public.dojo_contract_events FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner inserts own contract events"
  ON public.dojo_contract_events FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_dojo_contract_events_contract ON public.dojo_contract_events(contract_kind, contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dojo_contract_events_owner ON public.dojo_contract_events(owner_id, created_at DESC);

-- 5) Sequential contract number function
CREATE OR REPLACE FUNCTION public.dojo_next_contract_number(_owner UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _count INTEGER;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _count
  FROM (
    SELECT contract_number FROM public.dojo_student_contracts
      WHERE owner_id = _owner AND contract_number LIKE _year || '-%'
    UNION ALL
    SELECT contract_number FROM public.dojo_affiliate_contracts
      WHERE owner_id = _owner AND contract_number LIKE _year || '-%'
  ) x;
  RETURN _year || '-' || lpad(_count::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.dojo_next_contract_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dojo_next_contract_number(UUID) TO authenticated, service_role;
