-- Debug Script: List Resources
-- Use this to verify what resources actually exist and their metadata
-- This helps identify why the legacy lookup is failing

SELECT 
    id, 
    business_id, 
    type, 
    name, 
    active,
    metadata
FROM resources
ORDER BY created_at DESC;
