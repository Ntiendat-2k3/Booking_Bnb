-- Sprint 4: bookings + payments (VNPay)
-- Note: this project uses UUID. We rely on pgcrypto for gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_bookings_status') THEN
    CREATE TYPE enum_bookings_status AS ENUM ('pending_payment','confirmed','cancelled','completed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_provider') THEN
    CREATE TYPE enum_payments_provider AS ENUM ('vnpay','stripe');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payments_status') THEN
    CREATE TYPE enum_payments_status AS ENUM ('pending','succeeded','failed','cancelled','refunded');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INTEGER NOT NULL,
  status enum_bookings_status NOT NULL DEFAULT 'pending_payment',
  price_per_night_snapshot BIGINT NOT NULL,
  total_amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'VND',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_check_range CHECK (check_in < check_out)
);

CREATE INDEX IF NOT EXISTS idx_bookings_listing_dates ON bookings (listing_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings (guest_id);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider enum_payments_provider NOT NULL,
  status enum_payments_status NOT NULL DEFAULT 'pending',
  amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'VND',
  provider_txn_ref VARCHAR(255),
  provider_transaction_no VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payments (provider, provider_txn_ref);
