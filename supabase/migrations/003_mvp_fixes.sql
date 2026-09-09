-- ============================================================
-- Migration 003 — MVP fixes
-- Run this after schema.sql and 002_admin.sql
--
-- Covers:
--   • ratings.stars          — 1–5 star ratings (legacy `score` kept)
--   • conversations names    — per-participant display names
--   • jobs.category          — job category chip persisted
--   • increment_unread()     — safe unread counter bump for messages
--   • increment_completed_jobs() — worker completed-jobs counter
-- ============================================================

-- 1. Star ratings (1–5) alongside the legacy score column
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS stars INT;

-- 2. Participant names on conversations (other_user_name kept for back-compat)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user1_name TEXT;
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user2_name TEXT;

-- 3. Job category
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS category TEXT;

-- 4. Bump a conversation's unread counter (called via RPC after each message)
CREATE OR REPLACE FUNCTION increment_unread(conv_id TEXT)
RETURNS void AS $$
  UPDATE public.conversations
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE id = conv_id;
$$ LANGUAGE sql;

-- 5. Bump a profile's completed_jobs counter (called via RPC on job completion)
CREATE OR REPLACE FUNCTION increment_completed_jobs(profile_id TEXT)
RETURNS void AS $$
  UPDATE public.profiles
  SET completed_jobs = COALESCE(completed_jobs, 0) + 1
  WHERE id = profile_id;
$$ LANGUAGE sql;
