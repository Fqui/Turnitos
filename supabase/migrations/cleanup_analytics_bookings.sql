-- ============================================================================
-- CLEANUP SCRIPT: Analytics and Bookings Data
-- ============================================================================
-- This script removes all analytics and booking data while preserving:
-- - Business configurations
-- - User accounts
-- - Subscriptions
-- - Resources (courts, specialists, services)
-- - Subscription plans
--
-- USE WITH CAUTION: This action cannot be undone!
-- ============================================================================

BEGIN;

-- Display warning
DO $$
BEGIN
    RAISE NOTICE '⚠️  WARNING: This will delete ALL analytics and booking data!';
    RAISE NOTICE '📊 Tables affected: bookings, analytics (if exists), customer data';
    RAISE NOTICE '✅ Tables preserved: businesses, users, subscriptions, resources, subscription_plans';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Starting cleanup in 3 seconds...';
    PERFORM pg_sleep(3);
END $$;

-- ============================================================================
-- 1. DELETE BOOKINGS DATA
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️  Deleting bookings...';
END $$;

-- Delete all bookings
DELETE FROM bookings;

DO $$
BEGIN
    RAISE NOTICE '✅ Bookings deleted';
END $$;

-- ============================================================================
-- 2. DELETE ANALYTICS DATA (if table exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics') THEN
        RAISE NOTICE '🗑️  Deleting analytics...';
        DELETE FROM analytics;
        RAISE NOTICE '✅ Analytics deleted';
    ELSE
        RAISE NOTICE 'ℹ️  Analytics table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- 3. DELETE CUSTOMER DATA (optional - uncomment if needed)
-- ============================================================================

-- Uncomment the following lines if you want to delete customer data too:
-- DO $$
-- BEGIN
--     RAISE NOTICE '🗑️  Deleting customers...';
-- END $$;
-- DELETE FROM customers;
-- DO $$
-- BEGIN
--     RAISE NOTICE '✅ Customers deleted';
-- END $$;

-- ============================================================================
-- 4. RESET SEQUENCES (optional - for clean IDs)
-- ============================================================================

-- Uncomment if you want to reset auto-increment IDs:
-- ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS analytics_id_seq RESTART WITH 1;

-- ============================================================================
-- 5. VACUUM TABLES (Removed to avoid transaction errors)
-- ============================================================================

-- VACUUM removed because it cannot run inside a transaction block.
-- The database will auto-vacuum over time.

-- ============================================================================
-- 6. SUMMARY
-- ============================================================================

DO $$
DECLARE
    bookings_count INTEGER;
    analytics_count INTEGER := 0;
BEGIN
    -- Count remaining records
    SELECT COUNT(*) INTO bookings_count FROM bookings;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics') THEN
        SELECT COUNT(*) INTO analytics_count FROM analytics;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ CLEANUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   • Bookings remaining: %', bookings_count;
    RAISE NOTICE '   • Analytics remaining: %', analytics_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Preserved data:';
    RAISE NOTICE '   • Businesses and configurations';
    RAISE NOTICE '   • User accounts';
    RAISE NOTICE '   • Subscriptions and plans';
    RAISE NOTICE '   • Resources (courts, specialists, services)';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
