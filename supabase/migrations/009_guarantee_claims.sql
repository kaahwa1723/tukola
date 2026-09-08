-- ============================================================
-- Migration 009 — Guarantee claims (Phase 2 of the rebuild plan)
-- Run this AFTER 008_referrals.sql
--
-- Plan: "customer files claim with photos → admin reviews →
-- approve (re-do dispatch or refund ≤UGX 200K from reserve) →
-- ledger entries. Track loss ratio."
--
-- DESIGN
-- ──────
--   guarantee_claims — the case file. One row per claim:
--     submitted → under_review → approved_redo | approved_refund | rejected
--     (submitted may also resolve directly — under_review is an
--      optional working state, not a required gate)
--
--   Reserve money movement does NOT live on this table. Payouts are
--   append-only rows in guarantee_reserve (migration 005) with
--   entry_type='payout' and a NEGATIVE amount; guarantee_claims.
--   payout_ledger_id points at the payout row. Corrections are new
--   ledger rows (entry_type='adjustment'), never edits — the same
--   discipline as referral_credits in 008.
--
--   Reserve balance = SUM(guarantee_reserve.amount) — never a stored
--   number. Loss ratio = |SUM(payouts)| / SUM(accruals), computed in
--   lib/guarantee.ts. No fabricated figures.
--
--   Photo STORAGE is out of scope for this migration. photo_urls is a
--   text array of URLs/paths the client supplies; upload wiring
--   (Supabase Storage) lands later — the claim form currently collects
--   the reason only.
--
-- SAFETY INVARIANTS (enforced here, not by convention)
-- ────────────────────────────────────────────────────
--   • One OPEN claim per job: partial unique index on job_id
--     WHERE status IN ('submitted','under_review'). Resolved claims
--     don't block a future claim on a re-do job.
--   • amount_approved ≤ UGX 200,000 hard cap (CHECK) — the reserve
--     can never be drained by a single claim, whatever the code does.
--   • claimant must be a real profile; job/payment FKs RESTRICT
--     deletion so the audit trail cannot be orphaned.
--
-- RLS posture is unchanged: enable RLS with ZERO policies and strip
-- grants — anon/authenticated get NOTHING; the service role (API
-- routes) does everything, same as 005/006/008.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. GUARANTEE CLAIMS — the case file
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guarantee_claims (
  id               BIGSERIAL PRIMARY KEY,
  claimant_id      TEXT NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT, -- the customer (job's employer)
  job_id           TEXT NOT NULL REFERENCES jobs (id) ON DELETE RESTRICT,
  payment_id       BIGINT NOT NULL REFERENCES payments (id) ON DELETE RESTRICT, -- the released payment being claimed on
  reason           TEXT NOT NULL,
  photo_urls       TEXT[] NOT NULL DEFAULT '{}',  -- client-supplied URLs/paths; upload wiring comes later
  status           TEXT NOT NULL DEFAULT 'submitted'
                   CHECK (status IN ('submitted','under_review','approved_redo','approved_refund','rejected')),
  amount_claimed   INT CHECK (amount_claimed > 0),      -- NULL = claimant didn't state a figure
  amount_approved  INT CHECK (amount_approved >= 0 AND amount_approved <= 200000), -- UGX 200K hard cap
  reviewed_by      TEXT,                                 -- admin user id (audit — every resolution attributable)
  resolution_note  TEXT,
  payout_ledger_id BIGINT REFERENCES guarantee_reserve (id) ON DELETE SET NULL, -- the reserve payout row (refunds only)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS guarantee_claims_claimant_idx ON guarantee_claims (claimant_id);
CREATE INDEX IF NOT EXISTS guarantee_claims_job_idx      ON guarantee_claims (job_id);
CREATE INDEX IF NOT EXISTS guarantee_claims_status_idx   ON guarantee_claims (status);

-- One OPEN claim per job (DB-enforced — a code check alone races)
CREATE UNIQUE INDEX IF NOT EXISTS guarantee_claims_one_open_per_job
  ON guarantee_claims (job_id)
  WHERE status IN ('submitted','under_review');

COMMENT ON TABLE guarantee_claims IS
  'Guarantee claims (Phase 2). Customer files on a completed paid job; admin resolves as re-do or refund (≤UGX 200K, paid from the guarantee_reserve ledger). Payouts are append-only guarantee_reserve rows referenced by payout_ledger_id — never edits.';

-- ─────────────────────────────────────────────
-- 2. RLS — deny-all for anon/authenticated (no policies, grants
--    stripped). All access flows through API routes (service role).
-- ─────────────────────────────────────────────
ALTER TABLE guarantee_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON guarantee_claims FROM anon, authenticated;

-- service_role keeps full access (bypasses RLS) — used by the API routes.
