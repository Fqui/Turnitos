-- Add primary_color column to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2196F3';

-- Update existing businesses to use their button_color as primary_color if they have one
UPDATE businesses
SET primary_color = button_color
WHERE button_color IS NOT NULL AND primary_color IS NULL;
