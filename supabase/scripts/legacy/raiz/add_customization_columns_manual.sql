-- ============================================================
-- MANUAL MIGRATION: Add Business Customization Columns
-- ============================================================
-- Execute this in Supabase Dashboard > SQL Editor

-- 1. Add customizations columns
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6', -- Default blue
ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}'; -- Array of strings

-- 2. Add comments for clarity
COMMENT ON COLUMN businesses.theme IS 'UI Theme: light or dark';
COMMENT ON COLUMN businesses.primary_color IS 'Main brand color';
COMMENT ON COLUMN businesses.button_color IS 'Color for primary actions/buttons';

-- 3. Verify columns
SELECT 
    column_name, 
    data_type, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name IN ('theme', 'primary_color', 'button_color', 'rating', 'amenities');
