-- =============================================
-- Phase 9: Content Tables + User Confirmation
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- ---- Gallery tables ----
CREATE TABLE IF NOT EXISTS cafe_gallery (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT        NOT NULL,
  caption     TEXT,
  alt_text    TEXT        DEFAULT 'Cafe interior',
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_gallery (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT        NOT NULL,
  caption     TEXT,
  alt_text    TEXT        DEFAULT 'Studio',
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Review tables ----
CREATE TABLE IF NOT EXISTS cafe_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name   TEXT        NOT NULL,
  reviewer_role   TEXT        NOT NULL DEFAULT 'Google Review',
  review_date     TEXT,
  review_text     TEXT        NOT NULL,
  rating          INT         NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  sort_order      INT         NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name   TEXT        NOT NULL,
  reviewer_role   TEXT        NOT NULL DEFAULT 'Artist',
  review_date     TEXT,
  review_text     TEXT        NOT NULL,
  rating          INT         NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  sort_order      INT         NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Cafe promo cards ----
CREATE TABLE IF NOT EXISTS cafe_promos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Enable RLS ----
ALTER TABLE cafe_gallery   ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_promos    ENABLE ROW LEVEL SECURITY;

-- ---- Public read policies ----
CREATE POLICY "cafe_gallery_read"   ON cafe_gallery   FOR SELECT USING (is_active = TRUE);
CREATE POLICY "studio_gallery_read" ON studio_gallery FOR SELECT USING (is_active = TRUE);
CREATE POLICY "cafe_reviews_read"   ON cafe_reviews   FOR SELECT USING (is_active = TRUE);
CREATE POLICY "studio_reviews_read" ON studio_reviews FOR SELECT USING (is_active = TRUE);
CREATE POLICY "cafe_promos_read"    ON cafe_promos    FOR SELECT USING (is_active = TRUE);

-- ---- Admin write policies ----
CREATE POLICY "cafe_gallery_admin"   ON cafe_gallery   FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin'));
CREATE POLICY "studio_gallery_admin" ON studio_gallery FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin'));
CREATE POLICY "cafe_reviews_admin"   ON cafe_reviews   FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin'));
CREATE POLICY "studio_reviews_admin" ON studio_reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin'));
CREATE POLICY "cafe_promos_admin"    ON cafe_promos    FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin'));

-- ---- Add confirmation columns to users ----
-- DEFAULT TRUE so existing users are automatically considered confirmed.
-- signUpWithEmail sets is_confirmed = FALSE until OTP is verified.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS confirmation_code        TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_confirmed             BOOLEAN NOT NULL DEFAULT TRUE;

-- ---- Seed: cafe gallery ----
INSERT INTO cafe_gallery (image_url, sort_order) VALUES
  ('/cafe1.jpg', 1), ('/cafe2.jpg', 2), ('/cafe3.jpg', 3), ('/cafe4.jpg', 4),
  ('/cafe5.jpg', 5), ('/cafe6.jpg', 6), ('/cafe7.jpg', 7), ('/cafe8.jpg', 8);

-- ---- Seed: studio gallery ----
INSERT INTO studio_gallery (image_url, sort_order) VALUES
  ('/studio1.jpg', 1), ('/studio2.jpg', 2);

-- ---- Seed: cafe reviews ----
INSERT INTO cafe_reviews (reviewer_name, reviewer_role, review_date, review_text, rating, sort_order) VALUES
  ('Rey S.',   'Google Review', 'Aug 2023', 'This place is the chillest place during the weekdays where you could read or just cafe dates with the loved ones then transforms to the best place to chill and hear live music during Fridays and Saturdays.', 5, 1),
  ('Lyza G.',  'Google Review', 'Mar 2024', 'My Husband and I enjoyed the cozy place with cool music while drinking our coffee.', 5, 2),
  ('Ronaldo',  'Google Review', 'Jul 2023', 'I performed here as a musician at a private event & the overall vibe of this place is just off the hook.', 5, 3),
  ('Keyk G.',  'Google Review', 'Aug 2023', 'Ordered Iced White Chocolate Coffee and it was real good.', 5, 4),
  ('Gelo A.',  'Google Review', 'Apr 2023', 'Good food. Good Music.', 5, 5);

-- ---- Seed: studio reviews ----
INSERT INTO studio_reviews (reviewer_name, reviewer_role, review_date, review_text, rating, sort_order) VALUES
  ('Carlo Mendoza',      'Recording Artist', 'November 2024', 'Crystal-clear acoustics and world-class gear. We tracked our entire EP here and the results are stunning.', 5, 1),
  ('The Northside Band', 'Indie Band',       'October 2024',  'Rehearsed here every weekend for three months before our tour. The space is perfectly treated.', 5, 2),
  ('Lia Gonzales',       'Podcaster',        'October 2024',  'Amazing isolation booths for podcast recording. Sound quality blew my listeners away.', 5, 3);

-- ---- Seed: cafe promos ----
INSERT INTO cafe_promos (image_url, title, description, sort_order) VALUES
  ('/cafe-promo1.jpg',  'Freshly Roasted', 'Single-origin beans sourced from the Benguet highlands.', 1),
  ('/cafe-promo-2.jpg', 'Daily Vibes',     'Live acoustic sessions every Friday night.', 2);

-- ---- Seed: studio_features in system_settings ----
INSERT INTO system_settings (key, value) VALUES
  ('studio_features', '{"features": ["SSL console & Neve outboard gear", "Isolation booths for drums, vocals, and amps", "Yamaha C3 grand piano in the live room", "Vintage and modern guitar amp collection", "In-house session musicians available on request", "Lounge area with high-speed WiFi"]}')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

-- =============================================
-- IMPORTANT: In Supabase Dashboard > Auth > Settings
-- Disable "Enable email confirmations" so that
-- our custom OTP flow handles confirmation instead.
-- =============================================
