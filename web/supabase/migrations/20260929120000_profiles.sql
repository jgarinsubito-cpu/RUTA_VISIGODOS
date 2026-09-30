-- Visitor accounts: one profile row per auth user with visit preferences (explanation style,
-- transport, interests, pace, travel group) and, only with explicit consent, accessibility needs. Trips, saved places and chats stay on the visitor's device.
--
-- Apply once: Supabase dashboard -> SQL Editor -> paste and run (or `supabase db push`).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- How the assistant explains: general | family | expert (TripContext.profile).
  visitor_profile text not null default 'general' check (visitor_profile in ('general', 'family', 'expert')),
  -- Default way of getting around: walk | car (TripContext.transport).
  transport text not null default 'walk' check (transport in ('walk', 'car')),
  -- Site themes the visitor cares about (catalog `themes`): reorder places and routes.
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  -- Pace: relaxed | balanced | full. Who they travel with: solo | couple | family | friends | seniors.
  pace text check (pace in ('relaxed', 'balanced', 'full')),
  travel_group text check (travel_group in ('solo', 'couple', 'family', 'friends', 'seniors')),
  -- Access needs ({"needs": [...]}) and display answers (larger text, less motion). Kept only while consent is given:
  -- they can reveal health information (GDPR art. 9), so the app never stores them without it.
  accessibility jsonb not null default '{}'::jsonb check (jsonb_typeof(accessibility) = 'object'),
  accessibility_consent_at timestamptz,
  constraint accessibility_needs_consent check (accessibility = '{}'::jsonb or accessibility_consent_at is not null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Ruta Visigoda visitor preferences; accessibility answers only with consent.';

alter table public.profiles enable row level security;

-- Each visitor can read and change only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- Keep updated_at honest without trusting the client clock.
create or replace function public.profiles_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.profiles_touch_updated_at();
