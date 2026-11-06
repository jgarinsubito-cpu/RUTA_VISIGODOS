-- Complementary services (where to eat, sleep, rent a car, guided visits…), kept by staff in the
-- content admin and published with the catalog (docs/PLANIFICADOR.md). Apply after
-- 20261105130000_stop_models.sql.

alter table public.content_records drop constraint if exists content_records_kind_check;
alter table public.content_records
  add constraint content_records_kind_check check (kind in ('site', 'stop', 'service', 'claim', 'story', 'route', 'showcase'));
