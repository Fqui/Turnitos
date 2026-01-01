-- Migration to add email field to businesses for dedicated login
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS password TEXT;

-- Update existing businesses with the specific format and default password
UPDATE businesses 
SET 
  email = LOWER(REPLACE(name, ' ', '')) || '@turnitosLR.com',
  password = 'admin123'
WHERE email IS NULL OR password IS NULL;
