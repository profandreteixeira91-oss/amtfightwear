
-- 1. Colunas de controle de onboarding no perfil do dojo
ALTER TABLE public.dojo_academy_profile
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS accepted_amtpay_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_amtpay_terms_at timestamptz;

-- 2. Tabela de documentos do onboarding
CREATE TABLE IF NOT EXISTS public.dojo_onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('identity_front','identity_back','cnpj_card','address_proof','social_contract')),
  file_path text NOT NULL,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, doc_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dojo_onboarding_documents TO authenticated;
GRANT ALL ON public.dojo_onboarding_documents TO service_role;

ALTER TABLE public.dojo_onboarding_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own onboarding documents"
  ON public.dojo_onboarding_documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins manage all onboarding documents"
  ON public.dojo_onboarding_documents
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER dojo_onboarding_documents_updated_at
  BEFORE UPDATE ON public.dojo_onboarding_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Policies do bucket dojo-documents em storage.objects
CREATE POLICY "Owner reads own dojo documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dojo-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner uploads own dojo documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dojo-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner updates own dojo documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dojo-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'dojo-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner deletes own dojo documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dojo-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins manage all dojo documents"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'dojo-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'dojo-documents' AND public.has_role(auth.uid(), 'admin'::public.app_role));
