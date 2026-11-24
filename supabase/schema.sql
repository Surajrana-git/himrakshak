-- Himrakshak: driver reports.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  segment_id text not null,
  kind text not null check (kind in ('landslide', 'rockfall', 'road_blocked', 'water', 'clear')),
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
