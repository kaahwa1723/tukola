-- 023_vetting_queue.sql — Verified+ vetting queue
--
-- Founder direction (24 Sep 2026): two trust tiers.
--   is_verified   (existing) = ID-verified: admin confirmed the national
--                  ID. A quick toggle, already live in Documents review.
--   verified_plus (new)      = Verified+: full vetting via the queue —
--                  national ID + LC1 letter + trade certificate
--                  (DIT/UVTAB/UBTEB) WITH issuer check + police clearance.
--                  Conferred ONLY by POST /api/admin/vetting with all five
--                  checks ticked; never a raw column edit.
--
-- vetting_reviews is an append-per-decision audit trail: each row is one
-- review action on one fundi (who reviewed, which checks passed, notes,
-- when). The fundi's CURRENT state is profiles.verified_plus; the table
-- is the evidence of how it got there.
--
-- PRIVACY (PDPO): review rows reference PDPO-sensitive documents. RLS
-- posture identical to 008/019: enable RLS with ZERO policies and strip
-- grants — anon/authenticated get NOTHING, all access via service-role
-- API routes (admin-only for writes; the worker reads only their own
-- latest status via GET /api/vetting).
--
-- STATUS: DRAFT — show to founder, get explicit approval, THEN apply.
-- Code that uses these columns must not be deployed before this runs.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified_plus BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN profiles.verified_plus IS
  'Verified+ badge: full vetting passed (ID + LC1 + certificate + issuer check + police clearance). Server-owned; set ONLY by the vetting queue (POST /api/admin/vetting), never by the user or a raw admin toggle.';

CREATE TABLE IF NOT EXISTS vetting_reviews (
  id                  BIGSERIAL PRIMARY KEY,
  fundi_id            TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  id_ok               BOOLEAN NOT NULL DEFAULT FALSE,  -- national ID checked
  lc_letter_ok        BOOLEAN NOT NULL DEFAULT FALSE,  -- LC1 / area letter checked
  certificate_ok      BOOLEAN NOT NULL DEFAULT FALSE,  -- trade certificate checked
  issuer_check_ok     BOOLEAN NOT NULL DEFAULT FALSE,  -- certificate verified with issuer (DIT/UVTAB/UBTEB)
  police_clearance_ok BOOLEAN NOT NULL DEFAULT FALSE,  -- police clearance checked
  notes               TEXT,                            -- reviewer notes / rejection reason (shown to the fundi)
  reviewed_by         TEXT,                            -- admin label (PIN session has no user id)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ                      -- set when a decision (approve/reject) is made
);

CREATE INDEX IF NOT EXISTS vetting_reviews_fundi_idx  ON vetting_reviews (fundi_id);
CREATE INDEX IF NOT EXISTS vetting_reviews_status_idx ON vetting_reviews (status);

COMMENT ON TABLE vetting_reviews IS
  'Verified+ vetting audit trail. One row per review action per fundi: which of the five checks passed, decision, notes, reviewer. Approve requires ALL five checks true (enforced in lib/vetting.ts). PDPO-sensitive: service-role access only.';

-- RLS — same posture as 008/019: zero policies, no grants for
-- anon/authenticated; service_role (API routes) bypasses RLS.
ALTER TABLE vetting_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON vetting_reviews FROM anon, authenticated;
