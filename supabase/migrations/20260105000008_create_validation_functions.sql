-- Migration: Create validation functions
-- Date: 2026-01-05
-- Description: Functions for availability checking, space limits, and buffer time

-- ============================================================================
-- 1. Check Resource Availability
-- ============================================================================
CREATE OR REPLACE FUNCTION check_resource_availability(
    p_resource_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
) RETURNS TABLE (
    available BOOLEAN,
    slots_used INTEGER,
    total_capacity INTEGER
) AS $$
DECLARE
    v_capacity INTEGER;
    v_used INTEGER;
BEGIN
    -- Get resource capacity
    SELECT capacity INTO v_capacity
    FROM resources
    WHERE id = p_resource_id AND active = true;
    
    IF v_capacity IS NULL THEN
        RAISE EXCEPTION 'Resource not found or inactive';
    END IF;
    
    -- Count overlapping bookings
    SELECT COUNT(*) INTO v_used
    FROM bookings
    WHERE resource_id = p_resource_id
    AND status NOT IN ('cancelled')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time);
    
    -- Return availability info
    RETURN QUERY SELECT 
        (v_used < v_capacity) as available,
        v_used as slots_used,
        v_capacity as total_capacity;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Check Specialist Availability
-- ============================================================================
CREATE OR REPLACE FUNCTION check_specialist_availability(
    p_specialist_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_conflicts INTEGER;
BEGIN
    -- Count overlapping bookings
    SELECT COUNT(*) INTO v_conflicts
    FROM bookings
    WHERE specialist_id = p_specialist_id
    AND status NOT IN ('cancelled')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time);
    
    RETURN v_conflicts = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Check if Booking Can Be Rescheduled
-- ============================================================================
CREATE OR REPLACE FUNCTION can_reschedule_booking(
    p_booking_id UUID
) RETURNS TABLE (
    can_reschedule BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_booking RECORD;
    v_policy RECORD;
BEGIN
    -- Get booking
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Booking not found';
        RETURN;
    END IF;
    
    -- Get policy
    SELECT * INTO v_policy
    FROM booking_policies
    WHERE business_id = v_booking.business_id;
    
    -- Validate status
    IF v_booking.status IN ('completed', 'cancelled') THEN
        RETURN QUERY SELECT false, 'Booking already ' || v_booking.status;
        RETURN;
    END IF;
    
    -- Validate if confirmed
    IF v_booking.status = 'confirmed' THEN
        RETURN QUERY SELECT false, 'Cannot reschedule confirmed booking';
        RETURN;
    END IF;
    
    -- Validate reschedule limit
    IF v_booking.reschedule_count >= COALESCE(v_policy.max_reschedule_count, 1) THEN
        RETURN QUERY SELECT false, 'Maximum reschedule limit reached';
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Can reschedule';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_resource_availability IS 'Check if a resource has available capacity for a time slot';
COMMENT ON FUNCTION check_specialist_availability IS 'Check if a specialist is available for a time slot';
COMMENT ON FUNCTION can_reschedule_booking IS 'Check if a booking can be rescheduled based on business policies';
