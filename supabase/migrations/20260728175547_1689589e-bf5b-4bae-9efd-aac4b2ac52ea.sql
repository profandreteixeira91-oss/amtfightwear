
CREATE TABLE public.dojo_unit_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.dojo_units(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX dojo_unit_qr_tokens_one_active_per_unit
  ON public.dojo_unit_qr_tokens (owner_id, unit_id)
  WHERE active = true;

CREATE INDEX dojo_unit_qr_tokens_owner_idx ON public.dojo_unit_qr_tokens(owner_id);
CREATE INDEX dojo_unit_qr_tokens_unit_idx ON public.dojo_unit_qr_tokens(unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_unit_qr_tokens TO authenticated;
GRANT ALL ON public.dojo_unit_qr_tokens TO service_role;

ALTER TABLE public.dojo_unit_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own unit qr tokens"
  ON public.dojo_unit_qr_tokens
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
