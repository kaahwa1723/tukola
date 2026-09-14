-- 021_kyc_fields.sql — basic KYC at signup
--
-- Founder request: collect sex + date of birth so the admin panel has
-- real demographics to work with, and so profile-completion scoring has
-- more honest signals. Both optional at signup (never block conversion),
-- editable later from the profile.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN profiles.sex IS 'Self-declared: male | female. Basic KYC signal.';
COMMENT ON COLUMN profiles.date_of_birth IS 'Date of birth. Server enforces 18+ on write.';
