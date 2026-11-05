-- Stops (paradas): points inside a place where the guided tour stops, with recorded narration and
-- an image gallery (docs/ADMIN.md). Apply after 20261015120000_content_admin.sql.

/* ---------- A new record kind ---------- */

alter table public.content_records drop constraint if exists content_records_kind_check;
alter table public.content_records
  add constraint content_records_kind_check check (kind in ('site', 'stop', 'claim', 'story', 'route', 'showcase'));

/* ---------- Stop audio ---------- */

-- Public bucket: narration is played to every visitor. Only staff upload or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stop-audio', 'stop-audio', true, 31457280, array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "stop_audio_select_staff" on storage.objects;
create policy "stop_audio_select_staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'stop-audio' and (select public.is_staff()));

drop policy if exists "stop_audio_insert_staff" on storage.objects;
create policy "stop_audio_insert_staff" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'stop-audio' and (select public.is_staff()));

drop policy if exists "stop_audio_delete_staff" on storage.objects;
create policy "stop_audio_delete_staff" on storage.objects
  for delete to authenticated
  using (bucket_id = 'stop-audio' and (select public.is_staff()));
