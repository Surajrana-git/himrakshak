-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to run twice.

-- Offline SOS: the same call can arrive by internet, by SMS and through the Bluetooth mesh.
-- packet_id is the SOS's own id (HIM|<id>|…), so every copy is saved once.
alter table public.sos add column if not exists packet_id text unique;
alter table public.sos add column if not exists via text check (via in ('app', 'sms', 'mesh'));
alter table public.sos add column if not exists hazard text;

-- Push alerts: the server reads the phone tokens to send "SOS nearby" and "Road closed" alerts.
-- A token alone cannot send anything (that needs the Firebase key, kept only in Vercel).
create or replace function public.alert_tokens() returns setof text
  language sql security definer set search_path = public
  as $$ select token from public.push_tokens order by updated_at desc limit 500 $$;
grant execute on function public.alert_tokens() to anon, authenticated;
