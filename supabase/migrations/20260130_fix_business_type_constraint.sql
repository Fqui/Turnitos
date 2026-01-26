-- Fix business type constraint to accept both 'venue' and 'alquiler'
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_type_check;

ALTER TABLE businesses 
  ADD CONSTRAINT businesses_type_check 
  CHECK (type IN ('sport', 'service', 'alquiler', 'venue'));
