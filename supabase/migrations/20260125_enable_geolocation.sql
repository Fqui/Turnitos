-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location column with GEOGRAPHY type (srid 4326 is default for geography)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326);

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_businesses_location_point ON businesses USING GIST (location_point);

-- Function to automatically update location_point from lat/long columns
CREATE OR REPLACE FUNCTION update_location_point()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep location_point synced
DROP TRIGGER IF EXISTS update_business_location ON businesses;
CREATE TRIGGER update_business_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_location_point();

-- Backfill existing data
UPDATE businesses 
SET location_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
