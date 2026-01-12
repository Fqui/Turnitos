-- Fix bookings.specialist_id type to match specialists.id (TEXT)
-- This fixes the UUID error when creating bookings

DO $$
BEGIN
    -- Check if specialist_id column exists and is UUID type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'specialist_id'
        AND udt_name = 'uuid'
    ) THEN
        -- Drop foreign key constraint if exists
        ALTER TABLE bookings 
        DROP CONSTRAINT IF EXISTS bookings_specialist_id_fkey;
        
        -- Change column type from UUID to TEXT
        ALTER TABLE bookings 
        ALTER COLUMN specialist_id TYPE TEXT USING specialist_id::TEXT;
        
        -- Re-add foreign key constraint
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_specialist_id_fkey 
        FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Changed bookings.specialist_id from UUID to TEXT';
    ELSE
        RAISE NOTICE 'bookings.specialist_id is already TEXT or does not exist';
    END IF;
END $$;
