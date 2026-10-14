-- Cleanup script: Delete all bookings and customer data
-- Use this to reset the database for testing

-- Delete all bookings
DELETE FROM bookings;

-- Delete all customers
DELETE FROM customers;

-- Verify deletion
SELECT 'Bookings remaining:' as info, COUNT(*) as count FROM bookings
UNION ALL
SELECT 'Customers remaining:' as info, COUNT(*) as count FROM customers;
