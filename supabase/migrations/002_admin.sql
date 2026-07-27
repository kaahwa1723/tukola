-- ============================================================
-- Migration 002 — Admin features
-- Run this after schema.sql
-- ============================================================

-- Add blocked flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;

-- Index for quickly querying non-blocked users
CREATE INDEX IF NOT EXISTS profiles_blocked_idx ON profiles (blocked);

-- Note: the admin portal PIN is configured via the ADMIN_PIN environment
-- variable (see .env.local.example). Never hardcode a PIN in the repo.
