-- Migration: Create buffer time validation
-- Date: 2026-01-05
-- Description: Enforce 15-minute buffer between appointments for SERVICE businesses

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
    LEFT JOIN resources r ON r.id = NEW.resource_id
    WHERE s.id = NEW.specialist_id;
    
    -- Check for buffer time violations
    SELECT COUNT(*) INTO v_conflicts
    FROM bookings
    WHERE specialist_id = NEW.specialist_id
    AND status NOT IN ('cancelled')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_validate_buffer_time ON bookings;
CREATE TRIGGER trigger_validate_buffer_time
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_buffer_time();

COMMENT ON FUNCTION validate_buffer_time IS 'Enforce minimum buffer time between specialist appointments';
