-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, phone)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Initial migration: Populate customers from existing bookings
INSERT INTO customers (business_id, name, phone, created_at)
SELECT DISTINCT ON (business_id, customer_phone) 
    business_id, 
    customer_name, 
    customer_phone,
    MIN(created_at) OVER (PARTITION BY business_id, customer_phone)
FROM bookings
WHERE customer_phone IS NOT NULL AND customer_phone != '-'
ON CONFLICT (business_id, phone) DO NOTHING;

-- Function to sync new customers from bookings
CREATE OR REPLACE FUNCTION sync_booking_to_customers()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customers (business_id, name, phone, updated_at)
    VALUES (NEW.business_id, NEW.customer_name, NEW.customer_phone, NOW())
    ON CONFLICT (business_id, phone) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep customers table updated
DROP TRIGGER IF EXISTS trigger_sync_booking_to_customers ON bookings;
CREATE TRIGGER trigger_sync_booking_to_customers
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    WHEN (NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '-')
    EXECUTE FUNCTION sync_booking_to_customers();
