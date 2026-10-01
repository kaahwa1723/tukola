-- 024_site_mode.sql — site mode switch (coming soon ⇄ live)
--
-- Founder request (1 Oct 2026): shelve the live marketplace behind a
-- premium "Coming 2027" page while fundi recruitment continues. One row
-- (key = 'site_mode', value = 'coming_soon' | 'live') drives middleware.
-- Flipped ONLY from the admin panel (POST /api/admin/site-mode).
--
-- RLS posture identical to 008/019/023: deny-all for anon/authenticated;
-- middleware and API routes read/write via the service role.
--
-- STATUS: DRAFT — show to founder, get explicit approval, THEN apply.

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE site_settings IS
  'Server-owned site-wide flags. Currently: site_mode = coming_soon | live. Written only by POST /api/admin/site-mode.';

-- Default state on apply: SHELVED (coming soon). The marketplace stays
-- hidden until the founder flips the switch in the admin panel.
INSERT INTO site_settings (key, value)
VALUES ('site_mode', 'coming_soon')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON site_settings FROM anon, authenticated;
