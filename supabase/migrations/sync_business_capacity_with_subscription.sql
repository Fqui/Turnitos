-- Script to update business capacity when subscription changes

-- Example: Update capacity when subscription is upgraded
-- UPDATE businesses 
-- SET capacity = 5 
-- WHERE id = 'your-business-id';

-- Or update based on subscription spaces_included
UPDATE businesses b
SET capacity = s.spaces_included
FROM subscriptions s
WHERE b.id = s.business_id
AND s.status = 'active';

-- Verify the update
SELECT 
    b.id,
    b.name,
    b.type,
    b.capacity,
    s.plan_name,
    s.spaces_included
FROM businesses b
LEFT JOIN subscriptions s ON b.id = s.business_id
WHERE s.status = 'active';
