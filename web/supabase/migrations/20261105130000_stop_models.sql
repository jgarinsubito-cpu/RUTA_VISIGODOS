-- 3D models of stops (glTF/GLB, and USDZ for augmented reality on iPhone). Apply after
-- 20261105120000_stops.sql. Public bucket: models are shown to every visitor; only staff upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stop-models', 'stop-models', true, 52428800,
        array['model/gltf-binary', 'model/gltf+json', 'model/vnd.usdz+zip', 'application/octet-stream', 'application/json'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "stop_models_select_staff" on storage.objects;
create policy "stop_models_select_staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'stop-models' and (select public.is_staff()));

drop policy if exists "stop_models_insert_staff" on storage.objects;
create policy "stop_models_insert_staff" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'stop-models' and (select public.is_staff()));

drop policy if exists "stop_models_delete_staff" on storage.objects;
create policy "stop_models_delete_staff" on storage.objects
  for delete to authenticated
  using (bucket_id = 'stop-models' and (select public.is_staff()));
