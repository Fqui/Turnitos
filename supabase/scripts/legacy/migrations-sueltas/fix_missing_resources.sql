-- Fix missing resources
-- This script ensures all courts and services/specialists are present in the 'resources' table
-- to prevent foreign key errors when creating bookings.

-- 1. Disable Space Limit Trigger (Temporarily allow exceeding limits for migration)
ALTER TABLE resources DISABLE TRIGGER trigger_validate_resource_space_limit;

-- 2. Sync Courts
INSERT INTO resources (id, business_id, name, type, sport, base_price, metadata)
SELECT 
  gen_random_uuid(),
  business_id,
  name,
  'court',
  COALESCE(sport, 'padel'),
  price,
  jsonb_build_object('original_id', id::text)
FROM courts c
WHERE NOT EXISTS (
  SELECT 1 FROM resources r 
  WHERE r.metadata->>'original_id' = c.id::text AND r.type = 'court'
);

-- 2. Sync Services (as resources, for businesses where services act as resources)
-- Note: Logic depends on business type, but adding them safely doesn't hurt.
INSERT INTO resources (id, business_id, name, type, base_price, metadata)
SELECT 
  gen_random_uuid(),
  business_id,
  name,
  'service',
  price,
  jsonb_build_object('original_id', id::text)
FROM services s
WHERE NOT EXISTS (
  SELECT 1 FROM resources r 
  WHERE r.metadata->>'original_id' = s.id::text AND r.type = 'service'
);

-- 4. Re-enable Space Limit Trigger
ALTER TABLE resources ENABLE TRIGGER trigger_validate_resource_space_limit;

-- 3. Sync Specialists (if needed for appointment based businesses)
INSERT INTO resources (id, business_id, name, type, metadata)
SELECT 
  gen_random_uuid(),
  business_id,
  name,
  'specialist',
  jsonb_build_object('original_id', id::text, 'role', role)
FROM specialists s
WHERE NOT EXISTS (
  SELECT 1 FROM resources r 
  WHERE r.metadata->>'original_id' = s.id::text AND r.type = 'specialist'
);
