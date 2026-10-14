-- Migration to add venue-specific fields to businesses table
-- This enables support for event space rental businesses (quinchos, salones de fiesta, etc.)

-- Add new columns for venue business type
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS rental_duration_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS additional_services JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS included_amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;

-- Add comments to document the new fields
COMMENT ON COLUMN businesses.price_per_hour IS 'Price per hour for venue rentals';
COMMENT ON COLUMN businesses.rental_duration_options IS 'Array of available rental durations in hours, e.g. [4, 6, 8, 12]';
COMMENT ON COLUMN businesses.additional_services IS 'Array of optional add-on services with name, price, and icon';
COMMENT ON COLUMN businesses.included_amenities IS 'Array of amenities included in the base rental price';
COMMENT ON COLUMN businesses.gallery_images IS 'Array of image URLs for the venue photo gallery';

-- Example data structure for additional_services:
-- [
--   {"name": "Alquiler de Vajilla Completa", "price": 3500, "icon": "🍽️"},
--   {"name": "Servicio de DJ/Música", "price": 8000, "icon": "🎵"}
-- ]

-- Example data structure for included_amenities:
-- ["Parrilla a leña", "Mesas y sillas (50 personas)", "Heladera y freezer", "Sonido básico"]

-- Example data structure for gallery_images:
-- ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
