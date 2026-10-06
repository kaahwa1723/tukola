-- 025_availability.sql — fundi availability status
--
-- Competitor gap (TaskRabbit scheduling, Lynk Pro availability): a fundi
-- declares whether they can take work right now. Employers see an
-- "Available now" / "Busy" signal on fundi cards and profiles.
--
-- Deliberately simple: one self-declared status, no calendar. NULL = not
-- set — no badge is shown (never claim availability for a fundi who
-- hasn't said so). Self-service via PATCH /api/users/[id] (enum-validated).
--
-- STATUS: DRAFT — show to founder, get explicit approval, THEN apply.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS availability TEXT
  CHECK (availability IN ('available', 'busy', 'unavailable'));

COMMENT ON COLUMN profiles.availability IS
  'Self-declared work status: available | busy | unavailable. NULL = not set (no badge shown). Self-service; NOT a trust field — employers see it as a hint, not a guarantee.';
