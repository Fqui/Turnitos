-- ============================================================================
-- FULL RESET SCRIPT: Complete Database Cleanup
-- ============================================================================
-- ⚠️  DANGER ZONE: This script deletes EVERYTHING except:
-- - Database structure (tables, columns, constraints)
-- - Subscription plans catalog
--
-- This will DELETE:
-- - All businesses
-- - All users
-- - All bookings
-- - All subscriptions
-- - All resources (courts, specialists, services)
-- - All analytics
-- - All customers
--
-- USE ONLY FOR DEVELOPMENT/TESTING!
-- ============================================================================

BEGIN;

-- Display STRONG warning
DO $$
BEGIN
    RAISE NOTICE '🚨🚨🚨 DANGER ZONE 🚨🚨🚨';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  This will DELETE ALL DATA from the database!';
    RAISE NOTICE '⚠️  Only the database structure will remain!';
    RAISE NOTICE '';
    RAISE NOTICE '❌ This action CANNOT be undone!';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Starting FULL RESET in 5 seconds...';
    PERFORM pg_sleep(5);
END $$;

-- ============================================================================
-- DELETE ALL DATA (in correct order to respect foreign keys)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️  Step 1/7: Deleting bookings...';
END $$;
DELETE FROM bookings;

DO $$
BEGIN
    RAISE NOTICE '🗑️  Step 2/7: Deleting resources...';
END $$;
DELETE FROM resources;

DO $$
BEGIN
    RAISE NOTICE '🗑️  Step 3/7: Deleting subscriptions...';
END $$;
DELETE FROM subscriptions;

DO $$
BEGIN
    RAISE NOTICE '🗑️  Step 4/7: Deleting businesses...';
END $$;
DELETE FROM businesses;

DO $$
BEGIN
    RAISE NOTICE '🗑️  Step 5/7: Deleting customers...';
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        DELETE FROM customers;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '🗑️  Step 6/7: Deleting analytics...';
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics') THEN
        DELETE FROM analytics;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '🗑️  Step 7/7: Deleting legacy tables...';
END $$;
-- Delete from old schema tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courts') THEN
        DELETE FROM courts;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_specialists') THEN
        DELETE FROM service_specialists;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'services') THEN
        DELETE FROM services;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'specialists') THEN
        DELETE FROM specialists;
    END IF;
END $$;

-- ============================================================================
-- RESET AUTO-INCREMENT SEQUENCES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔄 Resetting sequences...';
END $$;

DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq.sequence_name);
    END LOOP;
END $$;

-- ============================================================================
-- VACUUM removed to avoid transaction errors
-- ============================================================================

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
    businesses_count INTEGER;
    bookings_count INTEGER;
    subscriptions_count INTEGER;
    resources_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO businesses_count FROM businesses;
    SELECT COUNT(*) INTO bookings_count FROM bookings;
    SELECT COUNT(*) INTO subscriptions_count FROM subscriptions;
    SELECT COUNT(*) INTO resources_count FROM resources;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ FULL RESET COMPLETED!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 Verification (all should be 0):';
    RAISE NOTICE '   • Businesses: %', businesses_count;
    RAISE NOTICE '   • Bookings: %', bookings_count;
    RAISE NOTICE '   • Subscriptions: %', subscriptions_count;
    RAISE NOTICE '   • Resources: %', resources_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database is now clean and ready for fresh data!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;
