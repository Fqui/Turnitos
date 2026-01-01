-- Add missing columns to bookings table for history and detailed status tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure status column exists and has correct type (if not already present)
-- ALTER TABLE bookings ALTER COLUMN status TYPE TEXT;
