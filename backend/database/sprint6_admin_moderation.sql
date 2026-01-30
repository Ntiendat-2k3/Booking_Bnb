-- Sprint 6: admin moderation additions
-- Reviews: add is_hidden for admin hide/unhide
ALTER TABLE IF EXISTS reviews
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS reviews
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_reviews_hidden ON reviews (is_hidden);
