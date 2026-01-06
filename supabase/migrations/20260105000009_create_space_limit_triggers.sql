-- Migration: Create space limit validation triggers
-- Date: 2026-01-05
-- Description: Enforce subscription space limits for SPORT/SERVICE businesses

-- ============================================================================
-- 1. Validate Space Limit (for resources and specialists)
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_space_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_subscription RECORD;
    v_business_type TEXT;
    v_spaces_used INTEGER;
BEGIN
    -- Get business type first
    SELECT type INTO v_business_type
    FROM businesses
    WHERE id = NEW.business_id;
    
    -- Get subscription
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE business_id = NEW.business_id
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active subscription found for business';
    END IF;
    
    -- Validation based on business type
    IF v_business_type IN ('sport', 'venue') THEN
        -- For SPORT and VENUE: count active resources that consume spaces
        IF TG_TABLE_NAME = 'resources' THEN
            IF (TG_OP = 'INSERT' AND NEW.active = true AND NEW.consumes_space = true) OR 
               (TG_OP = 'UPDATE' AND (OLD.active = false OR OLD.consumes_space = false) 
                AND NEW.active = true AND NEW.consumes_space = true) THEN
                
                SELECT COUNT(*) INTO v_spaces_used
                FROM resources
                WHERE business_id = NEW.business_id
                AND active = true
                AND consumes_space = true
                AND (TG_OP = 'INSERT' OR id != NEW.id);
                
                IF v_spaces_used >= v_subscription.spaces_included THEN
                    RAISE EXCEPTION 'Space limit exceeded. Your plan includes % spaces, you have % active resources. Upgrade your plan to add more resources.', 
                        v_subscription.spaces_included, v_spaces_used;
                END IF;
            END IF;
        END IF;
        
    ELSIF v_business_type = 'service' THEN
        -- For SERVICE: count specialists (no active column in original schema)
        IF TG_TABLE_NAME = 'specialists' THEN
            IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                
                SELECT COUNT(*) INTO v_spaces_used
                FROM specialists
                WHERE business_id = NEW.business_id
                AND (TG_OP = 'INSERT' OR id != NEW.id);
                
                IF v_spaces_used >= v_subscription.spaces_included THEN
                    RAISE EXCEPTION 'Specialist limit exceeded. Your plan includes % spaces (specialists), you have % specialists. Upgrade your plan to add more specialists.', 
                        v_subscription.spaces_included, v_spaces_used;
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for resources (SPORT/VENUE)
DROP TRIGGER IF EXISTS trigger_validate_resource_space_limit ON resources;
CREATE TRIGGER trigger_validate_resource_space_limit
    BEFORE INSERT OR UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION validate_space_limit();

-- Trigger for specialists (SERVICE)
DROP TRIGGER IF EXISTS trigger_validate_specialist_space_limit ON specialists;
CREATE TRIGGER trigger_validate_specialist_space_limit
    BEFORE INSERT OR UPDATE ON specialists
    FOR EACH ROW
    EXECUTE FUNCTION validate_space_limit();

-- ============================================================================
-- 2. Update Subscription Spaces Used Counter
-- ============================================================================
CREATE OR REPLACE FUNCTION update_subscription_spaces_used()
RETURNS TRIGGER AS $$
DECLARE
    v_business_type TEXT;
    v_spaces_count INTEGER;
BEGIN
    -- Get business type
    SELECT type INTO v_business_type
    FROM businesses
    WHERE id = COALESCE(NEW.business_id, OLD.business_id);
    
    -- Count spaces based on type
    IF v_business_type IN ('sport', 'venue') THEN
        -- Count resources that consume spaces
        SELECT COUNT(*) INTO v_spaces_count
        FROM resources
        WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
        AND active = true
        AND consumes_space = true;
        
    ELSIF v_business_type = 'service' THEN
        -- Count specialists (no active column in original schema)
        SELECT COUNT(*) INTO v_spaces_count
        FROM specialists
        WHERE business_id = COALESCE(NEW.business_id, OLD.business_id);
    END IF;
    
    -- Update counter in subscription
    UPDATE subscriptions
    SET spaces_used = v_spaces_count,
        updated_at = NOW()
    WHERE business_id = COALESCE(NEW.business_id, OLD.business_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update counter
DROP TRIGGER IF EXISTS trigger_update_spaces_from_resources ON resources;
CREATE TRIGGER trigger_update_spaces_from_resources
    AFTER INSERT OR UPDATE OR DELETE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_spaces_used();

DROP TRIGGER IF EXISTS trigger_update_spaces_from_specialists ON specialists;
CREATE TRIGGER trigger_update_spaces_from_specialists
    AFTER INSERT OR UPDATE OR DELETE ON specialists
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_spaces_used();

COMMENT ON FUNCTION validate_space_limit IS 'Enforce subscription space limits based on business type';
COMMENT ON FUNCTION update_subscription_spaces_used IS 'Keep subscription.spaces_used in sync with actual usage';
