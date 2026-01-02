-- Enable Realtime for bookings table
BEGIN;
  -- Add bookings table to the supabase_realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
COMMIT;
