-- ============================================================
-- Migration 007 — Reliability score v1
-- Run this AFTER 006_rls_lockdown.sql
--
-- Adds profiles.reliability_score: a per-fundi computed trust field
-- (Phase 2 of the rebuild plan: "per-fundi computed field from
-- completions, no-shows, late arrivals — simple weighted score, no ML").
--
-- The score is computed in TypeScript (lib/reliability.ts) from real
-- rows only — accepted applications, job outcomes, and resolved
-- disputes — and stored here so search/profile reads stay cheap.
--
--   NULL  = the fundi has no track record yet → the UI shows "New".
--           We never fabricate a score for fundis without history.
--   0–100 = computed value (see lib/reliability.ts for the formula).
--
-- Like rating / completed_jobs, this is a system-set trust field:
-- it is never writable through the self-service profile PATCH route.
-- RLS posture is unchanged (deny-all for anon; service role only).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reliability_score INT;

COMMENT ON COLUMN public.profiles.reliability_score IS
  'Reliability score v1 (0–100), computed from completions, disputes lost and no-shows by lib/reliability.ts. NULL = no history (show "New").';

-- Optional lookup aid for future "most reliable fundis" ordering
-- (partial index: only rows that actually have a score).
CREATE INDEX IF NOT EXISTS profiles_reliability_score_idx
  ON public.profiles (reliability_score DESC)
  WHERE reliability_score IS NOT NULL;
