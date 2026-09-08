-- ============================================================
-- Migration 010 — Reconciliation flags + job-post idempotency
-- Run this AFTER 009_guarantee_claims.sql
--
-- Two unrelated-but-small additions, combined to avoid migration
-- sprawl:
--
--   1. reconciliation_flags — the daily /api/cron/reconcile job
--      records every mismatch it finds here (stuck payments, provider
--      disagreements, commission/guarantee math drift, missing EFRIS
--      receipts). Flags are reviewed and resolved from the admin
--      analytics page. One OPEN flag per (payment, type): a partial
--      unique index makes daily re-detection idempotent — the cron
--      can run any number of times without stacking duplicates.
--
--      Flags are operational metadata, NOT money movement. Resolving
--      a flag never edits a payment; fixes happen through the normal
--      escrow flows (or append-only ledger rows) and the flag is
--      simply marked resolved with an audit trail.
--
--   2. jobs.idempotency_key — nullable, unique. The offline outbox
--      (lib/offline-queue.ts) generates a clientRequestId when a user
--      posts a job offline and reuses it on every replay; the POST
--      /api/jobs route dedupes on this column so a flush can never
--      double-post. NULLs don't collide in a unique index, so jobs
--      posted online without a key are unaffected.
--
-- RLS posture is unchanged: enable RLS with ZERO policies and strip
-- grants — anon/authenticated get NOTHING; the service role (API
-- routes) does everything, same as 005/006/008/009.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. RECONCILIATION FLAGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reconciliation_flags (
  id           BIGSERIAL PRIMARY KEY,
  payment_id   BIGINT NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  flag_type    TEXT NOT NULL CHECK (flag_type IN (
                 'provider_mismatch',            -- ledger vs provider disagree
                 'provider_status_check_failed', -- provider unreachable/erroring
                 'stuck_pending',                -- pending > 24h
                 'stuck_held',                   -- held > 72h (auto-release missed it)
                 'commission_math_mismatch',     -- stored commission above 17%/15% expectation
                 'guarantee_math_mismatch',      -- guarantee accrual != 2% of GMV (>1 UGX drift)
                 'over_distribution',            -- commission + fundi payout exceeds amount
                 'missing_receipt'               -- released without an EFRIS receipt number
               )),
  detail       JSONB NOT NULL DEFAULT '{}',     -- expected vs actual, provider status, etc.
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'resolved')),
  resolved_by  TEXT,                            -- admin user id (audit)
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reconciliation_flags_payment_idx ON reconciliation_flags (payment_id);
CREATE INDEX IF NOT EXISTS reconciliation_flags_status_idx  ON reconciliation_flags (status);

-- One OPEN flag per (payment, type): daily cron re-runs are idempotent.
-- Resolved flags don't block a NEW flag if the problem recurs.
CREATE UNIQUE INDEX IF NOT EXISTS reconciliation_flags_one_open_per_type
  ON reconciliation_flags (payment_id, flag_type)
  WHERE status = 'open';

COMMENT ON TABLE reconciliation_flags IS
  'Operational flags raised by /api/cron/reconcile (money ledger vs expectation). One open flag per (payment, type) via partial unique index. Resolving a flag never moves money — fixes go through escrow flows.';

-- ─────────────────────────────────────────────
-- 2. JOB-POST IDEMPOTENCY KEY (offline outbox dedupe)
-- ─────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_idempotency_key_idx
  ON jobs (idempotency_key);

COMMENT ON COLUMN jobs.idempotency_key IS
  'Client-generated idempotency key (offline outbox clientRequestId). POST /api/jobs returns the existing row on replay. NULL for posts made online without a key.';

-- ─────────────────────────────────────────────
-- 3. RLS — deny-all for anon/authenticated (no policies, grants
--    stripped). All access flows through API routes (service role).
-- ─────────────────────────────────────────────
ALTER TABLE reconciliation_flags ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON reconciliation_flags FROM anon, authenticated;

-- service_role keeps full access (bypasses RLS) — used by the API routes.
