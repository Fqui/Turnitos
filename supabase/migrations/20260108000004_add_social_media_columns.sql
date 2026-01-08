-- Add social media columns to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS youtube TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'tiktok'
    ) THEN
        RAISE EXCEPTION 'Column tiktok was not created';
    END IF;
END $$;
