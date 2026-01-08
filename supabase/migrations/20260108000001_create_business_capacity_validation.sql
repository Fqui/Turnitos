-- Drop old function if exists
DROP FUNCTION IF EXISTS check_business_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS check_business_availability(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

-- Create new function for business-level capacity validation
CREATE OR REPLACE FUNCTION check_business_availability(
    p_business_id TEXT,  -- Changed from UUID to TEXT to support both UUIDs and numeric IDs
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_booking_id TEXT DEFAULT NULL  -- Changed from UUID to TEXT
) RETURNS TABLE (
    available BOOLEAN,
    slots_used INTEGER,
    total_capacity INTEGER
) AS $$
DECLARE
    v_capacity INTEGER;
    v_used INTEGER;
BEGIN
    -- Get business capacity directly from businesses table
    SELECT capacity INTO v_capacity
    FROM businesses
    WHERE id::TEXT = p_business_id;  -- Cast id to TEXT for comparison
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business not found';
    END IF;
    
    -- Default to 1 if capacity is NULL or 0
    IF v_capacity IS NULL OR v_capacity = 0 THEN
        v_capacity := 1;
    END IF;
    
    -- Count ALL bookings for this business in the overlapping time slot
    SELECT COUNT(*) INTO v_used
    FROM bookings
    WHERE business_id::TEXT = p_business_id  -- Cast business_id to TEXT
    AND status NOT IN ('cancelled')
    AND (p_exclude_booking_id IS NULL OR id::TEXT != p_exclude_booking_id)  -- Cast id to TEXT
    AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time);
    
    -- Return availability info
    RETURN QUERY SELECT 
        (v_used < v_capacity) as available,
        v_used as slots_used,
        v_capacity as total_capacity;
END;
$$ LANGUAGE plpgsql;

-- Test the function
-- SELECT * FROM check_business_availability(
--     'your-business-id'::uuid,
--     '2026-01-08 09:00:00'::timestamptz,
--     '2026-01-08 10:00:00'::timestamptz
-- );
