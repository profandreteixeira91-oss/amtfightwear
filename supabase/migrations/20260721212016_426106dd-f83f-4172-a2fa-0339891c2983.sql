
drop policy if exists "dojo_cert_public_read" on storage.objects;
create policy "dojo_cert_public_read" on storage.objects
  for select using (bucket_id = 'dojo-certificates');

drop policy if exists "dojo_cert_owner_insert" on storage.objects;
create policy "dojo_cert_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dojo-certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "dojo_cert_owner_update" on storage.objects;
create policy "dojo_cert_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dojo-certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "dojo_cert_owner_delete" on storage.objects;
create policy "dojo_cert_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dojo-certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create index if not exists dojo_certificates_public_hash_idx
  on public.dojo_certificates (public_hash);

create index if not exists dojo_certificates_owner_issued_idx
  on public.dojo_certificates (owner_id, issued_at desc);
