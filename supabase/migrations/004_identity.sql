-- ============================================================
-- Migration 004 — Real identity: OTP codes + honest profile defaults
-- Run this AFTER 003_mvp_fixes.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. OTP CODES (service-role only; clients never touch this table)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL,                -- E.164 (+256...) only
  code_hash   TEXT NOT NULL,                -- HMAC-SHA256, never plaintext
  expires_at  TIMESTAMPTZ NOT NULL,         -- 10-minute TTL enforced in code
  attempts    INT NOT NULL DEFAULT 0,       -- max 5 verification attempts
  consumed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (phone, consumed, created_at DESC);

-- Retention (DPPA): OTP rows are meaningless after 10 minutes.
-- Periodic cleanup (run via cron / pg_cron / scheduled job):
--   DELETE FROM otp_codes WHERE created_at < NOW() - INTERVAL '1 day';

-- RLS: no policies at all → anonymous/authenticated roles get NOTHING.
-- Only the server (service role key) can read/write OTP data.
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 2. HONEST PROFILE DEFAULTS (Hard Rule 1: no fabricated data)
-- New users have NO rating, NO response-time claim, NO activity claim.
-- These fields are NULL until the system actually measures them.
-- ─────────────────────────────────────────────
ALTER TABLE profiles ALTER COLUMN rating        DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN response_time DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN last_active   DROP DEFAULT;

-- Same for applications rows: no fabricated rating on application snapshots
ALTER TABLE applications ALTER COLUMN rating DROP DEFAULT;
