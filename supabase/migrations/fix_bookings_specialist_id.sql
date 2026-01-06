-- Fix: Add missing specialist_id column to bookings table
-- Date: 2026-01-05
-- Description: This column is required by the buffer_time validation trigger

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS specialist_id UUID REFERENCES specialists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_specialist 
ON bookings(specialist_id) 
WHERE status NOT IN ('cancelled');

COMMENT ON COLUMN bookings.specialist_id IS 'Assigned specialist for SERVICE business bookings';
