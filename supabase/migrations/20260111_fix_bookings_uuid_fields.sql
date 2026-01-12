-- Fix bookings UUID fields to TEXT to match legacy fields
-- This fixes the UUID error when creating bookings for courts/services

DO $$
BEGIN
    -- Fix resource_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'resource_id'
        AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_resource_id_fkey;
        ALTER TABLE bookings ALTER COLUMN resource_id TYPE TEXT USING resource_id::TEXT;
        -- Don't re-add FK constraint since resources.id is UUID, we'll handle this in app logic
        RAISE NOTICE 'Changed bookings.resource_id from UUID to TEXT';
    END IF;

    -- First, fix specialists.id if it's UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'specialists' 
        AND column_name = 'id'
        AND udt_name = 'uuid'
    ) THEN
        -- Drop any FK constraints referencing specialists.id
        ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_specialist_id_fkey;
        ALTER TABLE service_specialists DROP CONSTRAINT IF EXISTS service_specialists_specialist_id_fkey;
        
        -- Change specialists.id from UUID to TEXT
        ALTER TABLE specialists ALTER COLUMN id TYPE TEXT USING id::TEXT;
        RAISE NOTICE 'Changed specialists.id from UUID to TEXT';
    END IF;

    -- Now fix specialist_id in bookings
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'specialist_id'
        AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE bookings ALTER COLUMN specialist_id TYPE TEXT USING specialist_id::TEXT;
        ALTER TABLE bookings ADD CONSTRAINT bookings_specialist_id_fkey 
            FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE SET NULL;
        RAISE NOTICE 'Changed bookings.specialist_id from UUID to TEXT';
    END IF;
    
    -- Fix service_specialists.specialist_id if it's UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_specialists' 
        AND column_name = 'specialist_id'
        AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE service_specialists ALTER COLUMN specialist_id TYPE TEXT USING specialist_id::TEXT;
        RAISE NOTICE 'Changed service_specialists.specialist_id from UUID to TEXT';
    END IF;
    
    -- Re-add service_specialists FK if needed
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'service_specialists_specialist_id_fkey'
    ) THEN
        ALTER TABLE service_specialists ADD CONSTRAINT service_specialists_specialist_id_fkey
            FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE;
        RAISE NOTICE 'Re-added service_specialists FK constraint';
    END IF;
END $$;
