-- Migration: Migrate existing services to resources table
-- Date: 2026-01-05
-- Description: Copy all services from services table to resources table

-- Migrate services to resources
-- Note: Generates new UUIDs since service IDs are not valid UUIDs
INSERT INTO resources (
    business_id, 
    name, 
    type, 
    category,
    base_price, 
    duration_minutes,
    buffer_minutes,
    capacity,
    consumes_space,
    active,
    metadata,
    created_at
)
SELECT 
    s.business_id,
    s.name,
    'service' as type,
    s.category,
    s.price as base_price,
    s.duration as duration_minutes,
    15 as buffer_minutes,
    1 as capacity,
    false as consumes_space, -- Services DON'T consume spaces (specialists do)
    true as active,
    jsonb_build_object(
        'old_service_id', s.id,
        'description', s.description,
        'image_url', s.image_url,
        'requires_specialist', true
    ) as metadata,
    NOW() as created_at
FROM services s;

-- Log migration
DO $$
DECLARE
    v_migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_migrated_count
    FROM resources
    WHERE type = 'service';
    
    RAISE NOTICE 'Migrated % services to resources table', v_migrated_count;
END $$;
