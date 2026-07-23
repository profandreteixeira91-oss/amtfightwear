-- Central de Contratos: adicionar suporte a "team" (colaboradores)

-- 1) Ampliar a restrição de tipos de contrato para incluir 'team'
ALTER TABLE public.dojo_contract_events
  DROP CONSTRAINT IF EXISTS dojo_contract_events_contract_kind_check;
ALTER TABLE public.dojo_contract_events
  ADD CONSTRAINT dojo_contract_events_contract_kind_check
  CHECK (contract_kind = ANY (ARRAY['student'::text, 'affiliate'::text, 'team'::text]));

-- 2) Nova tabela de contratos da equipe
CREATE TABLE IF NOT EXISTS public.dojo_team_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.dojo_team_members(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.dojo_contract_templates(id) ON DELETE SET NULL,
  template_version INTEGER,
  contract_number TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft','issued','sent','pending_signature','signed','active','refused','cancelled','expired','terminated','completed'])),
  role TEXT,
  compensation_type TEXT,
  compensation_value NUMERIC(12,2),
  weekly_hours INTEGER,
  start_date DATE,
  end_date DATE,
  header_html TEXT NOT NULL DEFAULT '',
  footer_html TEXT NOT NULL DEFAULT '',
  page_size TEXT NOT NULL DEFAULT 'A4',
  page_orientation TEXT NOT NULL DEFAULT 'portrait',
  margin_mm INTEGER NOT NULL DEFAULT 18,
  show_page_numbers BOOLEAN NOT NULL DEFAULT true,
  issued_by UUID,
  signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_team_contracts TO authenticated;
GRANT ALL ON public.dojo_team_contracts TO service_role;

ALTER TABLE public.dojo_team_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own team contracts"
  ON public.dojo_team_contracts
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_dojo_team_contracts_owner ON public.dojo_team_contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_dojo_team_contracts_member ON public.dojo_team_contracts(team_member_id);
CREATE INDEX IF NOT EXISTS idx_dojo_team_contracts_number ON public.dojo_team_contracts(owner_id, contract_number);

CREATE TRIGGER trg_dojo_team_contracts_upd
  BEFORE UPDATE ON public.dojo_team_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();