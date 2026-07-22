
CREATE POLICY "ig_media_auth_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ig-media');
CREATE POLICY "ig_media_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ig-media') WITH CHECK (bucket_id = 'ig-media');
CREATE POLICY "ig_media_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ig-media');
CREATE POLICY "ig_media_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'ig-media');
