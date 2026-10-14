-- Create bookings_analytics table for centralized data analysis
-- This table stores all booking information from all businesses for analytics purposes

CREATE TABLE IF NOT EXISTS bookings_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Original booking reference
    booking_id TEXT,
    
    -- Business information
    business_id TEXT,
    business_name TEXT,
    business_category TEXT,
    business_type TEXT, -- 'sport', 'service', 'venue'
    
    -- Booking details
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    booking_datetime TIMESTAMP,
    
    -- Customer information (anonymized for privacy)
    customer_name TEXT,
    customer_phone TEXT,
    customer_id TEXT, -- Hash or identifier for repeat customer tracking
    
    -- Service/Court information
    service_id TEXT,
    service_name TEXT,
    service_category TEXT,
    court_id TEXT,
    court_name TEXT,
    court_sport TEXT,
    
    -- Financial data
    price DECIMAL(10, 2),
    deposit_amount DECIMAL(10, 2),
    
    -- Booking metadata
    status TEXT NOT NULL, -- 'confirmed', 'cancelled', 'deposit_paid', 'blocked'
    duration INTEGER, -- in minutes
    metadata JSONB, -- Additional flexible data
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Analytics fields (populated by trigger)
    day_of_week INTEGER,
    hour_of_day INTEGER,
    week_of_year INTEGER,
    month INTEGER,
    year INTEGER,
    is_weekend BOOLEAN
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_business_id ON bookings_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_booking_date ON bookings_analytics(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_status ON bookings_analytics(status);
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_datetime ON bookings_analytics(booking_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_customer_id ON bookings_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_service_id ON bookings_analytics(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_created_at ON bookings_analytics(created_at);

-- Create a function to automatically sync bookings to analytics table
CREATE OR REPLACE FUNCTION sync_booking_to_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update analytics record
    INSERT INTO bookings_analytics (
        booking_id,
        business_id,
        business_name,
        business_category,
        business_type,
        booking_date,
        booking_time,
        booking_datetime,
        customer_name,
        customer_phone,
        customer_id,
        service_id,
        service_name,
        service_category,
        court_id,
        court_name,
        court_sport,
        price,
        status,
        duration,
        metadata,
        updated_at,
        cancelled_at,
        confirmed_at,
        day_of_week,
        hour_of_day,
        week_of_year,
        month,
        year,
        is_weekend
    )
    SELECT
        NEW.id,
        NEW.business_id,
        b.name,
        b.category,
        b.type,
        NEW.date::DATE,
        NEW.time::TIME,
        (NEW.date || ' ' || NEW.time)::timestamp,
        NEW.customer_name,
        NEW.customer_phone,
        MD5(NEW.customer_phone), -- Simple hash for customer tracking
        NEW.service_id,
        s.name,
        s.category,
        NEW.court_id,
        c.name,
        c.sport,
        NEW.price,
        NEW.status,
        NEW.duration,
        NEW.metadata,
        NOW(),
        CASE WHEN NEW.status = 'cancelled' THEN NOW() ELSE NULL END,
        CASE WHEN NEW.status = 'confirmed' THEN NOW() ELSE NULL END,
        EXTRACT(DOW FROM NEW.date::DATE)::INTEGER,
        EXTRACT(HOUR FROM NEW.time::TIME)::INTEGER,
        EXTRACT(WEEK FROM NEW.date::DATE)::INTEGER,
        EXTRACT(MONTH FROM NEW.date::DATE)::INTEGER,
        EXTRACT(YEAR FROM NEW.date::DATE)::INTEGER,
        EXTRACT(DOW FROM NEW.date::DATE) IN (0, 6)
    FROM businesses b
    LEFT JOIN services s ON s.id = NEW.service_id
    LEFT JOIN courts c ON c.id = NEW.court_id
    WHERE b.id = NEW.business_id
    ON CONFLICT (booking_id) 
    DO UPDATE SET
        status = EXCLUDED.status,
        price = EXCLUDED.price,
        updated_at = NOW(),
        cancelled_at = CASE WHEN EXCLUDED.status = 'cancelled' THEN NOW() ELSE bookings_analytics.cancelled_at END,
        confirmed_at = CASE WHEN EXCLUDED.status = 'confirmed' THEN NOW() ELSE bookings_analytics.confirmed_at END,
        booking_datetime = EXCLUDED.booking_datetime,
        day_of_week = EXCLUDED.day_of_week,
        hour_of_day = EXCLUDED.hour_of_day,
        week_of_year = EXCLUDED.week_of_year,
        month = EXCLUDED.month,
        year = EXCLUDED.year,
        is_weekend = EXCLUDED.is_weekend;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync bookings automatically
DROP TRIGGER IF EXISTS trigger_sync_booking_to_analytics ON bookings;
CREATE TRIGGER trigger_sync_booking_to_analytics
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION sync_booking_to_analytics();

-- Add unique constraint to prevent duplicate analytics entries
ALTER TABLE bookings_analytics 
ADD CONSTRAINT unique_booking_id UNIQUE (booking_id);

-- Create a view for easy analytics queries
CREATE OR REPLACE VIEW v_bookings_analytics_summary AS
SELECT
    business_id,
    business_name,
    business_category,
    business_type,
    DATE_TRUNC('month', booking_date) as month,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    COUNT(*) FILTER (WHERE status = 'deposit_paid') as deposit_paid_bookings,
    SUM(price) as total_revenue,
    SUM(price) FILTER (WHERE status = 'confirmed') as confirmed_revenue,
    AVG(price) as avg_booking_value,
    COUNT(DISTINCT customer_id) as unique_customers
FROM bookings_analytics
GROUP BY business_id, business_name, business_category, business_type, DATE_TRUNC('month', booking_date);

-- Grant permissions (adjust as needed for your RLS policies)
-- ALTER TABLE bookings_analytics ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE bookings_analytics IS 'Centralized analytics table for all bookings across all businesses';
COMMENT ON COLUMN bookings_analytics.customer_id IS 'MD5 hash of customer phone for privacy-preserving repeat customer tracking';
COMMENT ON COLUMN bookings_analytics.booking_datetime IS 'Combined date and time for easier querying';
