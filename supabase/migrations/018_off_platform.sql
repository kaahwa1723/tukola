-- 018_off_platform.sql — off-platform (cash) settlement tracking
--
-- The marketplace's biggest leak: a job gets accepted in the app, then
-- settled in cash outside it — no escrow, no guarantee, no receipt, no
-- rating. We can't stop it, but we CAN make it visible and costly:
--
--   1. Either party can declare "we settled outside Tukola" from the
--      completion page (after a warning modal listing exactly what both
--      sides lose). The job closes as 'cancelled' — which means the
--      existing reliability-score collapsed-booking penalty applies
--      automatically.
--   2. Every declaration is also written to leakage_events
--      (kind 'off_platform_settlement') so it appears in the admin
--      leakage view next to phone-number-in-chat signals.
--   3. The endpoint counts repeat settlements per user (60-day window)
--      and flags repeat offenders in its response + admin data.
--
-- All columns additive + nullable/defaulted — zero risk to existing rows.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS settled_off_platform    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS settled_off_platform_by TEXT REFERENCES profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settlement_note         TEXT;

COMMENT ON COLUMN jobs.settled_off_platform IS
  'True when the parties declared the job was settled in cash / outside Tukola escrow. No guarantee, receipt, or rating applies.';
COMMENT ON COLUMN jobs.settled_off_platform_by IS
  'Profile id of the user who declared the off-platform settlement.';
COMMENT ON COLUMN jobs.settlement_note IS
  'Optional short note from the declaring user (max 140 chars, sanitized).';

-- Repeat-offender counting: settlements declared by a given user, newest first
CREATE INDEX IF NOT EXISTS jobs_settled_off_platform_idx
  ON jobs (settled_off_platform_by, created_at DESC)
  WHERE settled_off_platform;
