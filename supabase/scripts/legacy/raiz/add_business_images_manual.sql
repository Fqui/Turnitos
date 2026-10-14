-- ============================================================
-- MANUAL MIGRATION: Add Logo and Banner Columns to Businesses
-- ============================================================
-- Execute this in Supabase Dashboard > SQL Editor
-- This adds default placeholder images for logo and banner

-- Add logo and banner columns with default placeholder images
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT 'https://placehold.co/400x400/1a1a1a/00e676?text=Logo',
ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT 'https://placehold.co/1200x400/1a1a1a/00e676?text=Banner';

-- Update existing businesses to have default images if they don't have any
UPDATE businesses 
SET logo_url = 'https://placehold.co/400x400/1a1a1a/00e676?text=Logo'
WHERE logo_url IS NULL;

UPDATE businesses 
SET banner_url = 'https://placehold.co/1200x400/1a1a1a/00e676?text=Banner'
WHERE banner_url IS NULL;

-- Add comments to columns
COMMENT ON COLUMN businesses.logo_url IS 'Business logo image URL - defaults to placeholder, should be updated in business portal';
COMMENT ON COLUMN businesses.banner_url IS 'Business banner/cover image URL - defaults to placeholder, should be updated in business portal';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name IN ('logo_url', 'banner_url');
