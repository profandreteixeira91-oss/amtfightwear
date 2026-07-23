
-- 1) Remover SELECT público do dojo_certificates (verificação pública agora é feita 100% server-side via /api/public/certificate/$hash com service role)
DROP POLICY IF EXISTS "Public verify cert" ON public.dojo_certificates;
REVOKE SELECT ON public.dojo_certificates FROM anon;

-- 2) Storage: exigir que uploads/updates/deletes no bucket dojo-students fiquem em uma pasta cujo primeiro nível seja o auth.uid() do usuário. SELECT público permanece (fotos são exibidas via URL pública).
DROP POLICY IF EXISTS "dojo-students auth upload" ON storage.objects;
DROP POLICY IF EXISTS "dojo-students auth update" ON storage.objects;
DROP POLICY IF EXISTS "dojo-students auth delete" ON storage.objects;

CREATE POLICY "dojo-students owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dojo-students'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "dojo-students owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dojo-students'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'dojo-students'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "dojo-students owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'dojo-students'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
