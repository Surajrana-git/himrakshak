-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to run twice.

-- Which phone sent a report (random id kept on the phone, nothing personal).
-- A road now closes only when 2 different phones report it; Road Rewards count per phone.
alter table public.reports add column if not exists device_id text;
create index if not exists reports_device_id on public.reports (device_id);

-- What the AI saw in the report photo ("blocked", "clear", "unclear") and how sure it was (0–1).
alter table public.reports add column if not exists ai_verdict text check (ai_verdict in ('blocked', 'clear', 'unclear'));
alter table public.reports add column if not exists ai_confidence real check (ai_confidence between 0 and 1);
