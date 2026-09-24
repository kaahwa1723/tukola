-- 022_trust_profile_fields.sql — trust-layer profile fields (fundi gating)
--
-- Founder request (24 Sep 2026): a fundi cannot get a job unless their
-- profile is complete. Mandatory: national ID, phone number (implicit —
-- OTP login), next of kin. Qualification and LC1/area letter or
-- certificate raise the profile-strength percentage (vetting evidence).
--
-- All columns are self-service via PATCH /api/users/[id] (validated
-- server-side). They are NOT trust badges: is_verified stays admin-set.
--
-- PRIVACY (PDPO): national ID + next-of-kin data are sensitive. They are
-- NEVER returned to non-owners — GET /api/users/[id] scrubs them like
-- phone numbers (same code path). Only the owner and the admin/vetting
-- team ever see them.
--
-- RLS posture unchanged: profiles is already deny-all for
-- anon/authenticated; all access flows through API routes (service role).
--
-- STATUS: DRAFT — show to founder, get explicit approval, THEN apply.
-- Code that uses these columns must not be deployed before this runs.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS national_id_number TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS national_id_photo_url TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS qualification TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS certificate_photo_url TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lc_letter_photo_url TEXT;

COMMENT ON COLUMN profiles.national_id_number IS
  'NIN (self-declared, validated format server-side). REQUIRED for fundis to apply for jobs. Verified only via the vetting queue — this column alone never confers a badge.';
COMMENT ON COLUMN profiles.national_id_photo_url IS
  'Photo of the national ID (profile-images bucket). PDPO-sensitive: never exposed to non-owners.';
COMMENT ON COLUMN profiles.next_of_kin_name IS
  'Emergency contact name. REQUIRED for fundis to apply for jobs.';
COMMENT ON COLUMN profiles.next_of_kin_phone IS
  'Emergency contact phone (E.164 +256, normalized server-side). PDPO-sensitive: never exposed to non-owners.';
COMMENT ON COLUMN profiles.qualification IS
  'Trade qualification (e.g. DIT/UVTAB/UBTEB certificate name). Optional — raises profile strength; evidence for the vetting queue.';
COMMENT ON COLUMN profiles.certificate_photo_url IS
  'Photo of the trade certificate. Optional — raises profile strength; evidence for the vetting queue.';
COMMENT ON COLUMN profiles.lc_letter_photo_url IS
  'Photo of the LC1 / area letter. Optional — raises profile strength; evidence for the vetting queue.';
