-- Check all UUID columns in bookings table that might be causing issues
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'bookings'
AND udt_name = 'uuid'
ORDER BY ordinal_position;
