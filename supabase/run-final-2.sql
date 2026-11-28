-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to run twice.
-- (Needs supabase/run-final.sql first.)

-- Approval of each post:
--   approved     the AI checked every photo and found a live Geo Cam shot → shown on the map with its photo
--   pending      no photo, or the AI was busy → waits; approved when a second phone posts the same thing nearby
--   rejected     the AI found a screenshot, a photo of a screen or a gallery photo → never on the map, no points
alter table public.contributions add column if not exists status text not null default 'pending'
  check (status in ('approved', 'pending', 'rejected'));
alter table public.contributions add column if not exists ai_reason text check (char_length(ai_reason) <= 200);
