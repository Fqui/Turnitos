-- Migration: Migrate existing bookings to new schema
-- Date: 2026-01-05
-- Description: Populate resource_id, start_time, end_time from existing data

-- Update bookings with resource_id from court_id (via metadata mapping)
UPDATE bookings b
SET resource_id = r.id,
    start_time = (b.date || ' ' || b.time)::TIMESTAMPTZ,
    end_time = (b.date || ' ' || b.time)::TIMESTAMPTZ + INTERVAL '60 minutes'
FROM resources r
WHERE b.court_id IS NOT NULL 
AND b.resource_id IS NULL
AND r.type = 'court'
AND r.metadata->>'old_court_id' = b.court_id;

-- Update bookings with resource_id from service_id (via metadata mapping)
UPDATE bookings b
SET resource_id = r.id,
    start_time = (b.date || ' ' || b.time)::TIMESTAMPTZ,
    end_time = (b.date || ' ' || b.time)::TIMESTAMPTZ + (COALESCE(b.duration, 60) || ' minutes')::INTERVAL
FROM resources r
WHERE b.service_id IS NOT NULL 
AND b.resource_id IS NULL
AND r.type = 'service'
AND r.metadata->>'old_service_id' = b.service_id;

-- Log migration
DO $$
DECLARE
    v_migrated_count INTEGER;
    v_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_migrated_count
    FROM bookings
    WHERE resource_id IS NOT NULL;
    
    SELECT COUNT(*) INTO v_null_count
    FROM bookings
    WHERE resource_id IS NULL;
    
    RAISE NOTICE 'Migrated % bookings to new schema', v_migrated_count;
    
    IF v_null_count > 0 THEN
        RAISE WARNING '% bookings still have NULL resource_id', v_null_count;
    END IF;
END $$;
