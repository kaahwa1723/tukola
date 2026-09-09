-- ============================================================
-- TUKOLA — Full Database Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. PROFILES (workers + employers)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  phone             TEXT UNIQUE NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('worker', 'employer')),
  location          TEXT,
  avatar            TEXT,
  rating            NUMERIC(3,2) DEFAULT 4.50,
  completed_jobs    INT DEFAULT 0,
  skills            TEXT[] DEFAULT '{}',
  about             TEXT,
  response_time     TEXT DEFAULT '< 30 mins',
  last_active       TEXT DEFAULT 'Just now',
  is_verified       BOOLEAN DEFAULT FALSE,
  company           TEXT,
  portfolio_images  TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_phone_idx ON profiles (phone);
CREATE INDEX IF NOT EXISTS profiles_role_idx  ON profiles (role);

-- ─────────────────────────────────────────────
-- 2. JOBS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id               TEXT PRIMARY KEY DEFAULT ('job_' || gen_random_uuid()),
  title            TEXT NOT NULL,
  description      TEXT,
  location         TEXT NOT NULL,
  date_time        TIMESTAMPTZ,
  workers_needed   INT DEFAULT 1,
  pay              INT,
  urgency          TEXT DEFAULT 'scheduled' CHECK (urgency IN ('immediate', 'scheduled')),
  status           TEXT DEFAULT 'open'      CHECK (status   IN ('open', 'in_progress', 'completed', 'cancelled')),
  employer_id      TEXT REFERENCES profiles (id) ON DELETE SET NULL,
  employer_name    TEXT NOT NULL,
  employer_phone   TEXT,
  skills           TEXT[] DEFAULT '{}',
  images           TEXT[] DEFAULT '{}',
  estimated_hours  INT,
  distance_km      NUMERIC(6,2),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS jobs_status_idx      ON jobs (status);
CREATE INDEX IF NOT EXISTS jobs_employer_id_idx ON jobs (employer_id);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx  ON jobs (created_at DESC);

-- ─────────────────────────────────────────────
-- 3. APPLICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id              BIGSERIAL PRIMARY KEY,
  job_id          TEXT NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  worker_id       TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  worker_name     TEXT NOT NULL,
  worker_avatar   TEXT,
  rating          NUMERIC(3,2) DEFAULT 4.50,
  completed_jobs  INT DEFAULT 0,
  skills          TEXT[] DEFAULT '{}',
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_id, worker_id)
);

CREATE INDEX IF NOT EXISTS applications_job_id_idx    ON applications (job_id);
CREATE INDEX IF NOT EXISTS applications_worker_id_idx ON applications (worker_id);

-- ─────────────────────────────────────────────
-- 4. CONVERSATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                  TEXT PRIMARY KEY DEFAULT ('conv_' || gen_random_uuid()),
  user1_id            TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  user2_id            TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  other_user_name     TEXT NOT NULL,
  other_user_avatar   TEXT,
  job_id              TEXT REFERENCES jobs (id) ON DELETE SET NULL,
  job_title           TEXT,
  last_message        TEXT DEFAULT '',
  last_message_time   TIMESTAMPTZ DEFAULT NOW(),
  unread_count        INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user1_id, user2_id, job_id)
);

CREATE INDEX IF NOT EXISTS conversations_user1_idx ON conversations (user1_id);
CREATE INDEX IF NOT EXISTS conversations_user2_idx ON conversations (user2_id);

-- ─────────────────────────────────────────────
-- 5. MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  conversation_id  TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  from_id          TEXT NOT NULL REFERENCES profiles (id),
  to_id            TEXT NOT NULL REFERENCES profiles (id),
  from_name        TEXT NOT NULL,
  text             TEXT NOT NULL,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  read             BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_timestamp_idx       ON messages (timestamp DESC);

-- ─────────────────────────────────────────────
-- 6. RATINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id         BIGSERIAL PRIMARY KEY,
  job_id     TEXT NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  from_id    TEXT NOT NULL REFERENCES profiles (id),
  to_id      TEXT NOT NULL REFERENCES profiles (id),
  score      TEXT NOT NULL CHECK (score IN ('great', 'issues')),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_id, from_id)
);

-- ─────────────────────────────────────────────
-- 7. ROW-LEVEL SECURITY — LOCKED-DOWN POSTURE (supersedes the original demo policies)
-- ─────────────────────────────────────────────
-- ⚠️  DO NOT create USING (true) policies here. The original version of this
-- file shipped 17 wide-open policies; migration 006_rls_lockdown.sql drops
-- them on existing databases. The app accesses the DB exclusively through
-- API routes with the service-role key (which bypasses RLS), and auth is
-- custom OTP — there is no auth.uid() for per-user policies. Therefore:
-- RLS ENABLED + ZERO POLICIES = deny-all for anon/authenticated = correct.
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings       ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- ─────────────────────────────────────────────
-- 8. STORAGE BUCKETS (run separately in Storage UI or via SDK)
-- ─────────────────────────────────────────────
-- In the Supabase dashboard → Storage, create two buckets:
--   • "job-images"       (public)
--   • "profile-images"   (public)
-- Or run:
-- SELECT storage.create_bucket('job-images',      '{"public": true}');
-- SELECT storage.create_bucket('profile-images',  '{"public": true}');

-- ─────────────────────────────────────────────
-- 9. HELPER FUNCTION: update updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
