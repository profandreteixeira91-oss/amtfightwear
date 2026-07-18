
ALTER TABLE public.dojo_students
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS health_insurance text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS anamnesis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS has_medical_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_clearance_date date,
  ADD COLUMN IF NOT EXISTS lgpd_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lgpd_consent_date timestamptz,
  ADD COLUMN IF NOT EXISTS image_rights_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_date timestamptz;

DROP POLICY IF EXISTS "dojo-students public read" ON storage.objects;
CREATE POLICY "dojo-students public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'dojo-students');

DROP POLICY IF EXISTS "dojo-students auth upload" ON storage.objects;
CREATE POLICY "dojo-students auth upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dojo-students');

DROP POLICY IF EXISTS "dojo-students auth update" ON storage.objects;
CREATE POLICY "dojo-students auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'dojo-students') WITH CHECK (bucket_id = 'dojo-students');

DROP POLICY IF EXISTS "dojo-students auth delete" ON storage.objects;
CREATE POLICY "dojo-students auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'dojo-students');
