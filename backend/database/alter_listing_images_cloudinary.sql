-- Add Cloudinary fields for listing_images (Sprint Images)
ALTER TABLE IF EXISTS listing_images
  ADD COLUMN IF NOT EXISTS public_id TEXT,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS bytes INTEGER,
  ADD COLUMN IF NOT EXISTS format VARCHAR(20),
  ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'image';
