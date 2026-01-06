-- Migration: Update bookings table for new schema
-- Date: 2026-01-05
-- Description: Add resource_id, start_time, end_time columns

-- Add new columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_resource_time 
ON bookings(resource_id, start_time, end_time) 
WHERE status NOT IN ('cancelled');

CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_availability 
ON bookings(resource_id, start_time, end_time, status)
WHERE status NOT IN ('cancelled');

-- Add constraint for valid time range (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_time_range' 
        AND conrelid = 'bookings'::regclass
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT valid_time_range 
        CHECK (end_time > start_time);
    END IF;
END $$;

COMMENT ON COLUMN bookings.resource_id IS 'Reference to unified resources table (replaces court_id/service_id)';
COMMENT ON COLUMN bookings.start_time IS 'Booking start timestamp (replaces separate date + time)';
COMMENT ON COLUMN bookings.end_time IS 'Booking end timestamp (calculated from start + duration)';
