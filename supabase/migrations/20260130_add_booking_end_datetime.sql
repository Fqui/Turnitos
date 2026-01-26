-- Add end_date and end_time fields to bookings table for multi-day reservations
-- This allows handling reservations that cross midnight (e.g., 20:00 to 08:00 next day)

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add comment to explain the purpose
COMMENT ON COLUMN bookings.end_date IS 'End date for multi-day bookings (can be different from start date)';
COMMENT ON COLUMN bookings.end_time IS 'End time for the booking';

-- Create index for efficient querying of bookings by end_date
CREATE INDEX IF NOT EXISTS idx_bookings_end_date ON bookings(end_date);

-- Update existing bookings to set end_date and end_time based on duration
-- For existing bookings, end_date = date and end_time = time + duration
UPDATE bookings
SET 
  end_date = date,
  end_time = (time::time + (COALESCE(duration, 60) || ' minutes')::interval)::time
WHERE end_date IS NULL;
