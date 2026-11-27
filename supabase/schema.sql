-- Himrakshak: driver reports.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  segment_id text not null,
  kind text not null check (kind in ('landslide', 'rockfall', 'road_blocked', 'water', 'jam', 'clear')),
  note text check (char_length(note) <= 280),
  lat double precision not null,
  lon double precision not null,
  photo_url text
);

-- Prototype rules: anyone can read and add reports, nobody can edit or delete.
alter table public.reports enable row level security;

create policy "anyone can read reports" on public.reports
  for select to anon, authenticated using (true);

create policy "anyone can add a report" on public.reports
  for insert to anon, authenticated with check (true);

-- Push new reports to every open map instantly.
alter publication supabase_realtime add table public.reports;

-- Public bucket for report photos.
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

create policy "anyone can upload report photos" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'report-photos');

-- SOS calls for help. Prototype rule: anyone can send and read, so the rescue
-- dashboard works without login. Before a real launch, limit "read" to rescue staff.
create table if not exists public.sos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lat double precision not null,
  lon double precision not null,
  accuracy_m double precision,
  message text check (char_length(message) <= 280)
);

alter table public.sos enable row level security;

create policy "anyone can send sos" on public.sos
  for insert to anon, authenticated with check (true);

create policy "prototype: anyone can read sos" on public.sos
  for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.sos;

-- Saved places, grouped into the user's own lists. Each user sees only their own rows.
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list_name text not null default 'Favourites' check (char_length(list_name) between 1 and 40),
  name text not null check (char_length(name) between 1 and 80),
  lat double precision not null,
  lon double precision not null
);

alter table public.saved_places enable row level security;

create policy "own saved places" on public.saved_places
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
