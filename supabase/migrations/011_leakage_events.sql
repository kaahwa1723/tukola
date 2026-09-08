-- ============================================================
-- Migration 011 — Leakage events table (Phase 2, "log, don't block")
-- Run this AFTER 010_reconciliation_and_idempotency.sql
--
-- lib/leakage.ts scans in-app chat for off-platform signals
-- (Ugandan phone numbers, direct-payment keywords). The messages API
-- (app/api/messages/[conversationId]/route.ts) has been INSERTing into
-- `leakage_events` since Phase 2 shipped, but the table itself was never
-- created by a migration — every insert has been failing silently into
-- the non-fatal catch. This migration creates the table so the Monday
-- metrics review (and the new /admin/leakage page) can measure leakage.
--
-- PRIVACY CHOICE (documented): we store WHICH signal matched
-- (e.g. 'phone_number', 'keyword:momo'), never the message text.
-- Measurement must not become a surveillance archive.
--
-- RLS posture is unchanged: deny-all for anon/authenticated, the
-- service role (API routes) does everything — same as 005/008/010.
-- ============================================================

CREATE TABLE IF NOT EXISTS leakage_events (
  id                    BIGSERIAL PRIMARY KEY,
  conversation_id       TEXT REFERENCES conversations (id) ON DELETE CASCADE,
  job_id                TEXT REFERENCES jobs (id) ON DELETE SET NULL,
  from_id               TEXT REFERENCES profiles (id) ON DELETE SET NULL,
  matched               TEXT NOT NULL,            -- comma-joined signals, e.g. 'phone_number,keyword:momo'
  had_captured_payment  BOOLEAN NOT NULL DEFAULT FALSE, -- true when the job already had money in escrow (safer chat)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leakage_events_created_idx ON leakage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS leakage_events_from_idx    ON leakage_events (from_id);
CREATE INDEX IF NOT EXISTS leakage_events_job_idx     ON leakage_events (job_id);

COMMENT ON TABLE leakage_events IS
  'Off-platform signals detected in chat (Phase 2, log-dont-block). Stores WHICH signal matched, never the message text. Messages are never blocked; this table exists to measure leakage for the weekly metrics review.';

-- RLS — same posture as 005/008/010: enable RLS with ZERO policies and
-- strip table-level grants. anon/authenticated get NOTHING; all access
-- flows through API routes using the service-role key.
ALTER TABLE leakage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON leakage_events FROM anon, authenticated;

-- service_role keeps full access (bypasses RLS) — used by the API routes.
