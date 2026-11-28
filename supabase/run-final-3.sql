-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to run twice.

-- Offline SOS: the same call can arrive by internet, by SMS and through the Bluetooth mesh.
-- packet_id is the SOS's own id (HIM|<id>|…), so every copy is saved once.
alter table public.sos add column if not exists packet_id text unique;
alter table public.sos add column if not exists via text check (via in ('app', 'sms', 'mesh'));
alter table public.sos add column if not exists hazard text;
