-- Fix bookings.business_id type to match businesses.id (TEXT)
-- This fixes the "invalid input syntax for type uuid" error

-- First, check if business_id is UUID and convert to TEXT
DO $$
BEGIN
    -- Check if business_id column exists and is UUID type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'business_id'
        AND udt_name = 'uuid'
    ) THEN
        -- Drop foreign key constraint if exists
        ALTER TABLE bookings 
        DROP CONSTRAINT IF EXISTS bookings_business_id_fkey;
        
        -- Change column type from UUID to TEXT
        ALTER TABLE bookings 
        ALTER COLUMN business_id TYPE TEXT;
        
        -- Re-add foreign key constraint
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_business_id_fkey 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Changed bookings.business_id from UUID to TEXT';
    ELSE
        RAISE NOTICE 'bookings.business_id is already TEXT or does not exist';
    END IF;
END $$;
