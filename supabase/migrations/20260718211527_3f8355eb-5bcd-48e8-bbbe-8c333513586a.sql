
CREATE POLICY "dojo-videos public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'dojo-videos');
CREATE POLICY "dojo-videos authenticated upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dojo-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dojo-videos owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dojo-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dojo-videos owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dojo-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
