-- Fix analytics trigger to use correct category columns
-- This resolves the "column b.category does not exist" error

CREATE OR REPLACE FUNCTION sync_booking_to_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update analytics record
    INSERT INTO bookings_analytics (
        booking_id,
        business_id,
        business_name,
        business_category, -- Will store the category NAME
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
        cat.name, -- Fetch category name from categories table
        b.type,
        NEW.date::DATE,
        NEW.time::TIME,
        (NEW.date || ' ' || NEW.time)::timestamp,
        NEW.customer_name,
        NEW.customer_phone,
        MD5(NEW.customer_phone),
        NEW.service_id,
        s.name,
        s.category, -- Services table still has 'category' column
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
    LEFT JOIN categories cat ON cat.id = b.category_id -- JOIN to get category name
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
