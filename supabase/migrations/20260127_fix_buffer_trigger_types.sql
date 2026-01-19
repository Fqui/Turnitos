-- Fix buffer time validation trigger type mismatch error (UUID vs TEXT)
-- The JOIN on resources table was failing because resources.id is UUID 
-- but bookings.resource_id was converted to TEXT.

CREATE OR REPLACE FUNCTION validate_buffer_time()
RETURNS TRIGGER AS $$
DECLARE
    v_buffer_minutes INTEGER;
    v_conflicts INTEGER;
BEGIN
    -- Only for bookings with specialists (SERVICE businesses)
    IF NEW.specialist_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get buffer time from specialist or resource (default 15)
    SELECT COALESCE(s.buffer_minutes, r.buffer_minutes, 15) INTO v_buffer_minutes
    FROM specialists s
    -- Explicitly cast IDs to text to match bookings.resource_id type (TEXT)
    LEFT JOIN resources r ON r.id::text = NEW.resource_id::text
    WHERE s.id::text = NEW.specialist_id::text;
    
    -- Check for buffer time violations
    SELECT COUNT(*) INTO v_conflicts
    FROM bookings
    WHERE specialist_id = NEW.specialist_id
    AND status NOT IN ('cancelled')
    AND id::text != COALESCE(NEW.id::text, '00000000-0000-0000-0000-000000000000') -- Handle UUID/TEXT comparison
    AND (
        -- New booking starts before previous ends + buffer
        (NEW.start_time >= start_time AND NEW.start_time < end_time + (v_buffer_minutes || ' minutes')::INTERVAL)
        OR
        -- New booking ends after next starts - buffer
        (NEW.end_time > start_time - (v_buffer_minutes || ' minutes')::INTERVAL AND NEW.end_time <= end_time)
    );
    
    IF v_conflicts > 0 THEN
        RAISE EXCEPTION 'Buffer time violation. There must be at least % minutes between appointments for this specialist.', v_buffer_minutes;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Force function update
COMMENT ON FUNCTION validate_buffer_time IS 'Fixed types: Enforces text casting for joins to prevent uuid=text errors';
