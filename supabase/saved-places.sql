-- Run this once in the Supabase SQL Editor (the rest of schema.sql is already in place).
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
