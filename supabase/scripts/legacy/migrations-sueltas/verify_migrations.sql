-- Migration Verification Script
-- Run this after all migrations to verify everything is correct

-- =========================================
-- Migration Verification Script
-- =========================================

DO $$
DECLARE
    v_count INTEGER;
    v_record RECORD;
BEGIN
    -- 1. Check subscriptions table
    RAISE NOTICE '1. Checking subscriptions table...';
    SELECT COUNT(*) INTO v_count FROM subscriptions;
    RAISE NOTICE 'Total subscriptions: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM subscriptions WHERE status = 'active';
    RAISE NOTICE 'Active subscriptions: %', v_count;
    
    -- 2. Check subscription plans
    RAISE NOTICE '';
    RAISE NOTICE '2. Checking subscription plans...';
    FOR v_record IN 
        SELECT business_type, COUNT(*) as plan_count
        FROM subscription_plans
        GROUP BY business_type
        ORDER BY business_type
    LOOP
        RAISE NOTICE '  % plans: %', v_record.business_type, v_record.plan_count;
    END LOOP;
    
    -- 3. Check resources table
    RAISE NOTICE '';
    RAISE NOTICE '3. Checking resources table...';
    FOR v_record IN
        SELECT 
            type,
            COUNT(*) as total_count,
            COUNT(CASE WHEN active THEN 1 END) as active_count,
            COUNT(CASE WHEN consumes_space THEN 1 END) as consuming_spaces
        FROM resources
        GROUP BY type
        ORDER BY type
    LOOP
        RAISE NOTICE '  Type %: % total, % active, % consuming spaces', 
            v_record.type, v_record.total_count, v_record.active_count, v_record.consuming_spaces;
    END LOOP;
    
    -- 4. Check bookings migration
    RAISE NOTICE '';
    RAISE NOTICE '4. Checking bookings migration...';
    SELECT COUNT(*) INTO v_count FROM bookings;
    RAISE NOTICE 'Total bookings: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM bookings WHERE resource_id IS NOT NULL;
    RAISE NOTICE 'Bookings with resource_id: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM bookings WHERE start_time IS NOT NULL;
    RAISE NOTICE 'Bookings with start_time: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM bookings WHERE end_time IS NOT NULL;
    RAISE NOTICE 'Bookings with end_time: %', v_count;
    
    -- 5. Check specialists
    RAISE NOTICE '';
    RAISE NOTICE '5. Checking specialists...';
    SELECT COUNT(*) INTO v_count FROM specialists;
    RAISE NOTICE 'Total specialists: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM specialists WHERE buffer_minutes IS NOT NULL;
    RAISE NOTICE 'Specialists with buffer_minutes: %', v_count;
    
    -- 6. Check functions exist
    RAISE NOTICE '';
    RAISE NOTICE '6. Checking functions...';
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
        'check_resource_availability',
        'check_specialist_availability',
        'can_reschedule_booking',
        'validate_space_limit',
        'update_subscription_spaces_used',
        'validate_buffer_time'
    );
    RAISE NOTICE 'Functions created: %/6', v_count;
    
    -- 7. Check triggers exist
    RAISE NOTICE '';
    RAISE NOTICE '7. Checking triggers...';
    SELECT COUNT(*) INTO v_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND trigger_name IN (
        'trigger_validate_resource_space_limit',
        'trigger_validate_specialist_space_limit',
        'trigger_update_spaces_from_resources',
        'trigger_update_spaces_from_specialists',
        'trigger_validate_buffer_time'
    );
    RAISE NOTICE 'Triggers created: %/5', v_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Verification Complete!';
    RAISE NOTICE '=========================================';
END $$;

-- 8. Verify subscription spaces_used accuracy
SELECT 
    b.id as business_id,
    b.type,
    CASE 
        WHEN b.type IN ('sport', 'venue') THEN (
            SELECT COUNT(*) 
            FROM resources r 
            WHERE r.business_id = b.id 
            AND r.active = true 
            AND r.consumes_space = true
        )
        WHEN b.type = 'service' THEN (
            SELECT COUNT(*) 
            FROM specialists sp 
            WHERE sp.business_id = b.id
        )
        ELSE 0
    END as actual_spaces_used,
    s.spaces_used as recorded_spaces_used,
    s.spaces_included,
    CASE 
        WHEN (CASE 
            WHEN b.type IN ('sport', 'venue') THEN (
                SELECT COUNT(*) 
                FROM resources r 
                WHERE r.business_id = b.id 
                AND r.active = true 
                AND r.consumes_space = true
            )
            WHEN b.type = 'service' THEN (
                SELECT COUNT(*) 
                FROM specialists sp 
                WHERE sp.business_id = b.id
            )
            ELSE 0
        END) = s.spaces_used THEN '✓ OK'
        ELSE '✗ MISMATCH'
    END as status
FROM businesses b
LEFT JOIN subscriptions s ON s.business_id = b.id
WHERE s.id IS NOT NULL
ORDER BY b.id;
