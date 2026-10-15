-- Content admin (docs/ADMIN.md): editors draft records, validators publish catalog snapshots, and
-- the visitor app reads the latest snapshot. Everything goes through row-level security with the
-- signed-in user's session; the app never needs the secret key.
--
-- Apply once, after 20260929120000_profiles.sql: Supabase dashboard -> SQL Editor -> paste and
-- run (or `supabase db push`). Then add staff by hand (docs/ADMIN.md, "Who can edit").

/* ---------- Staff ---------- */

-- editor: creates and edits drafts, sends them to review. validator: also publishes and restores.
create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('editor', 'validator')),
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

comment on table public.staff is 'Ruta Visigoda content staff. Rows are added by hand in the SQL editor.';

alter table public.staff enable row level security;

-- Role checks for policies. Security definer so they can read public.staff under its own policy.
create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.staff where user_id = (select auth.uid())
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()))
$$;

-- Staff see the team (names next to changes); nobody can change it from the app.
drop policy if exists "staff_select_staff" on public.staff;
create policy "staff_select_staff" on public.staff
  for select to authenticated using ((select public.is_staff()));

/* ---------- Records being edited ---------- */

-- One row per place, claim, story, route, plus the home page and assistant settings ("showcase").
-- data is the record as the editor wrote it (checked by the app: domain/editorial/schema.ts).
-- status: draft (being edited) | review (sent to a validator) | published (the web shows this
-- working copy) | retired (off the web).
create table if not exists public.content_records (
  kind text not null check (kind in ('site', 'claim', 'story', 'route', 'showcase')),
  id text not null check (char_length(id) <= 80 and id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 100000),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'retired')),
  -- In review: the editor asks for the record to be taken off the web.
  retire boolean not null default false,
  -- Order on the web and in lists; takes effect at the next publication.
  position integer not null default 0,
  -- Bumped on every change; publishing refuses a record that changed after it was checked.
  rev integer not null default 1,
  review_note text check (char_length(review_note) <= 1000),
  first_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (kind, id),
  constraint content_records_data_id check (kind = 'showcase' or data ->> 'id' = id)
);

comment on table public.content_records is 'Ruta Visigoda content being edited; the web shows public.catalog_snapshots.';

alter table public.content_records enable row level security;

drop policy if exists "content_select_staff" on public.content_records;
create policy "content_select_staff" on public.content_records
  for select to authenticated using ((select public.is_staff()));

drop policy if exists "content_insert_staff" on public.content_records;
create policy "content_insert_staff" on public.content_records
  for insert to authenticated with check ((select public.is_staff()));

drop policy if exists "content_update_staff" on public.content_records;
create policy "content_update_staff" on public.content_records
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Only records that never reached the web can be deleted; published ones are retired instead.
drop policy if exists "content_delete_unpublished" on public.content_records;
create policy "content_delete_unpublished" on public.content_records
  for delete to authenticated using ((select public.is_staff()) and first_published_at is null);

-- Workflow rules the policies cannot express (they cannot see the old row):
--  - kind and id never change; rev, updated_at and updated_by are set here, not by the client;
--  - only validators publish or retire, and only they set first_published_at;
--  - changing a record's content always makes it a draft again, so an unreviewed change can never
--    ride along with the next publication.
create or replace function public.content_records_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  validator boolean := (select public.staff_role()) is not distinct from 'validator';
begin
  if tg_op = 'INSERT' then
    new.rev := 1;
    if not validator then
      if new.status not in ('draft', 'review') then
        raise exception 'Solo quien valida puede publicar o retirar.' using errcode = '42501';
      end if;
      new.first_published_at := null;
    end if;
  else
    if new.kind <> old.kind or new.id <> old.id then
      raise exception 'Un registro no puede cambiar de identificador.' using errcode = '22023';
    end if;
    if new.data is distinct from old.data and new.status in ('published', 'retired') then
      new.status := 'draft';
    end if;
    if not validator then
      if new.status <> old.status and new.status in ('published', 'retired') then
        raise exception 'Solo quien valida puede publicar o retirar.' using errcode = '42501';
      end if;
      new.first_published_at := old.first_published_at;
    end if;
    new.rev := old.rev + 1;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists content_records_guard on public.content_records;
create trigger content_records_guard
  before insert or update on public.content_records
  for each row execute function public.content_records_guard();

/* ---------- Published versions ---------- */

-- Each publication is a complete, checked catalog (domain/types.ts Catalog). Never changed or
-- deleted: restoring an old version publishes a copy of it.
create table if not exists public.catalog_snapshots (
  version integer generated always as identity primary key,
  catalog jsonb not null check (jsonb_typeof(catalog) = 'object' and octet_length(catalog::text) <= 5000000),
  note text check (char_length(note) <= 500),
  restored_from integer references public.catalog_snapshots (version),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null
);

comment on table public.catalog_snapshots is 'Ruta Visigoda published catalog versions; visitors read the latest.';

alter table public.catalog_snapshots enable row level security;

create or replace function public.latest_catalog_version()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max(version) from public.catalog_snapshots
$$;

-- Visitors (and the server, with the publishable key) read only what the web shows now: earlier
-- versions may hold withdrawn claims. Staff read the history.
drop policy if exists "snapshots_select_latest" on public.catalog_snapshots;
create policy "snapshots_select_latest" on public.catalog_snapshots
  for select to anon, authenticated
  using (version = (select public.latest_catalog_version()) or (select public.is_staff()));

drop policy if exists "snapshots_insert_validator" on public.catalog_snapshots;
create policy "snapshots_insert_validator" on public.catalog_snapshots
  for insert to authenticated
  with check ((select public.staff_role()) = 'validator' and published_by = (select auth.uid()));

-- Publish a checked catalog and record what it means for the records, in one transaction.
-- p_base_version: the latest version when the caller built the catalog (null when none): another
-- publication in between fails this one. p_updates: [{kind, id, rev, status}], each applied only
-- if the record is still at that rev. Runs with the caller's rights (policies above apply).
create or replace function public.publish_catalog(
  p_catalog jsonb,
  p_base_version integer,
  p_note text,
  p_updates jsonb,
  p_restored_from integer default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version integer;
  v_update jsonb;
  v_count integer;
begin
  if (select public.staff_role()) is distinct from 'validator' then
    raise exception 'Solo quien valida puede publicar.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ruta-visigoda:publish-catalog'));
  if (select max(version) from public.catalog_snapshots) is distinct from p_base_version then
    raise exception 'Se ha publicado otra versión mientras tanto.' using errcode = 'P0409';
  end if;

  for v_update in select value from jsonb_array_elements(coalesce(p_updates, '[]'::jsonb)) loop
    update public.content_records
       set status = v_update ->> 'status',
           retire = false,
           review_note = case when v_update ->> 'status' in ('published', 'retired') then null else review_note end,
           first_published_at = case
             when v_update ->> 'status' = 'published' then coalesce(first_published_at, now())
             else first_published_at
           end
     where kind = v_update ->> 'kind'
       and id = v_update ->> 'id'
       and rev = (v_update ->> 'rev')::integer;
    get diagnostics v_count = row_count;
    if v_count <> 1 then
      raise exception 'El registro %:% ha cambiado mientras tanto.', v_update ->> 'kind', v_update ->> 'id'
        using errcode = 'P0409';
    end if;
  end loop;

  -- After the record checks, so a refused publication does not use up a version number.
  insert into public.catalog_snapshots (catalog, note, restored_from, published_by)
  values (p_catalog, nullif(btrim(p_note), ''), p_restored_from, auth.uid())
  returning version into v_version;

  return v_version;
end;
$$;

revoke execute on function public.publish_catalog(jsonb, integer, text, jsonb, integer) from public, anon;
grant execute on function public.publish_catalog(jsonb, integer, text, jsonb, integer) to authenticated;

/* ---------- Place photos ---------- */

-- Public bucket: photos are shown to every visitor. Only staff upload or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-images', 'place-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Staff can list the bucket (and read back what they upload).
drop policy if exists "place_images_select_staff" on storage.objects;
create policy "place_images_select_staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'place-images' and (select public.is_staff()));

drop policy if exists "place_images_insert_staff" on storage.objects;
create policy "place_images_insert_staff" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'place-images' and (select public.is_staff()));

drop policy if exists "place_images_delete_staff" on storage.objects;
create policy "place_images_delete_staff" on storage.objects
  for delete to authenticated
  using (bucket_id = 'place-images' and (select public.is_staff()));
