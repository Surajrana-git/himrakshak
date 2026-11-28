-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to run twice.

-- What travellers add to the map from the + sheet: Add a Place, Fix Map, Post on Map, Report Hazard.
-- Shown to everyone in "View Posted Events"; each one earns Road Rewards points.
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('place', 'fix', 'post', 'hazard')),
  category text not null,
  title text check (char_length(title) <= 80),
  details text check (char_length(details) <= 300),
  lat double precision not null,
  lon double precision not null,
  photo_urls text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'community')),
  device_id text,
  user_id uuid default auth.uid()
);
create index if not exists contributions_created_at on public.contributions (created_at desc);
create index if not exists contributions_device_id on public.contributions (device_id);
alter table public.contributions enable row level security;
drop policy if exists "anyone can read contributions" on public.contributions;
create policy "anyone can read contributions" on public.contributions for select to anon, authenticated using (true);
drop policy if exists "anyone can add a contribution" on public.contributions;
create policy "anyone can add a contribution" on public.contributions for insert to anon, authenticated with check (true);
do $$ begin
  alter publication supabase_realtime add table public.contributions;
exception when duplicate_object then null;
end $$;

-- Routes a signed-in user saves from the route planner ("My Routes").
create table if not exists public.saved_routes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  mode text not null default 'car',
  from_name text not null,
  from_lat double precision not null,
  from_lon double precision not null,
  to_name text not null,
  to_lat double precision not null,
  to_lon double precision not null,
  km real not null,
  hours real not null,
  risk int not null
);
alter table public.saved_routes enable row level security;
drop policy if exists "own saved routes" on public.saved_routes;
create policy "own saved routes" on public.saved_routes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
