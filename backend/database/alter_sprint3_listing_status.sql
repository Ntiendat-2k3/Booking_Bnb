DO $$
BEGIN
  -- case 1
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_listings_status') THEN
    BEGIN ALTER TYPE enum_listings_status ADD VALUE 'pending'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE enum_listings_status ADD VALUE 'rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  -- case 2 (DB của bạn)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    BEGIN ALTER TYPE listing_status ADD VALUE 'pending'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE listing_status ADD VALUE 'rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;
