-- Migration: Add capacity column to businesses table
-- Date: 2026-01-08
-- Description: Store business capacity directly in businesses table for simpler management

-- Add capacity column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1;

-- Update existing service businesses to have capacity = number of specialists
UPDATE businesses 
SET capacity = (
    SELECT COUNT(*) 
    FROM specialists 
    WHERE specialists.business_id = businesses.id
)
WHERE type = 'service' AND capacity IS NULL;

-- Update existing sport/venue businesses to have capacity = number of resources
UPDATE businesses 
SET capacity = (
    SELECT COUNT(*) 
    FROM resources 
    WHERE resources.business_id = businesses.id 
    AND active = true 
    AND consumes_space = true
)
WHERE type IN ('sport', 'venue') AND capacity IS NULL;

-- Set default capacity of 1 for any remaining NULL values
UPDATE businesses 
SET capacity = 1 
WHERE capacity IS NULL OR capacity = 0;

-- Verify the changes
SELECT id, name, type, capacity 
FROM businesses 
ORDER BY type, name;
