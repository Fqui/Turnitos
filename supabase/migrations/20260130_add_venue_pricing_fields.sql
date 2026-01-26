-- Add pricing_model and price_per_day to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS pricing_model text DEFAULT 'hourly' CHECK (pricing_model IN ('hourly', 'daily')),
ADD COLUMN IF NOT EXISTS price_per_day numeric;

-- Add comments for documentation
COMMENT ON COLUMN businesses.pricing_model IS 'Determines if the venue is rented by hour or by day';
COMMENT ON COLUMN businesses.price_per_day IS 'Price per day when pricing_model is daily';
