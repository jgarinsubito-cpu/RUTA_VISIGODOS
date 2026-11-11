-- Museum pieces linked to the places they come from (docs/PIEZAS.md). Apply after
-- 20261106120000_services.sql.

alter table public.content_records drop constraint if exists content_records_kind_check;
alter table public.content_records
  add constraint content_records_kind_check check (kind in ('site', 'stop', 'piece', 'service', 'claim', 'story', 'route', 'showcase'));
