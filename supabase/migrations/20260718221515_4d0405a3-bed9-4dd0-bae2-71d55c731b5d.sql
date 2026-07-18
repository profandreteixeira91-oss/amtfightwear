
CREATE POLICY "dojo-brand read" ON storage.objects FOR SELECT USING (bucket_id = 'dojo-brand');
CREATE POLICY "dojo-brand insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dojo-brand');
CREATE POLICY "dojo-brand update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dojo-brand') WITH CHECK (bucket_id = 'dojo-brand');
CREATE POLICY "dojo-brand delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dojo-brand');
