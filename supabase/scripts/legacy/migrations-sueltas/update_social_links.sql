-- Update script to ensure all businesses have social links populated (at least with 'home')
-- This ensures the buttons show up in the UI for testing purposes.

DO $$
BEGIN

    -- 1. Update Instagram
    UPDATE businesses 
    SET instagram = 'home' 
    WHERE instagram IS NULL OR instagram = '';

    -- 2. Update Facebook
    UPDATE businesses 
    SET facebook = 'home' 
    WHERE facebook IS NULL OR facebook = '';

    -- 3. Update TikTok
    UPDATE businesses 
    SET tiktok = 'home' 
    WHERE tiktok IS NULL OR tiktok = '';

    RAISE NOTICE '✅ Social media links updated to default "home" where missing.';

END $$;
