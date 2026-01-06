-- Migration: Migrate existing courts to resources table
-- Date: 2026-01-05
-- Description: Copy all courts from courts table to resources table

-- Migrate courts to resources
-- Note: Generates new UUIDs since court IDs are not valid UUIDs
INSERT INTO resources (
    business_id, 
    name, 
    type, 
    sport, 
    base_price, 
    duration_minutes,
    capacity,
    consumes_space,
    active,
    metadata,
    created_at
)
SELECT 
    business_id,
    name,
    'court' as type,
    COALESCE(sport, 'padel') as sport, -- Default to 'padel' if NULL
    price as base_price,
    60 as duration_minutes, -- Default 60 minutes for courts
    1 as capacity,
    true as consumes_space, -- Courts consume spaces
    true as active,
    jsonb_build_object('old_court_id', id) as metadata, -- Store old ID for reference
    NOW() as created_at
FROM courts;

-- Log migration
DO $$
DECLARE
    v_migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_migrated_count
    FROM resources
    WHERE type = 'court';
    
    RAISE NOTICE 'Migrated % courts to resources table', v_migrated_count;
END $$;
