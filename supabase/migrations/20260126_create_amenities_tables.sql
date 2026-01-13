-- Create amenities catalog table
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'Wifi', 'Estacionamiento'
    icon_key TEXT NOT NULL, -- Featuer or Lucid icon name, e.g., 'Wifi', 'Car'
    category TEXT DEFAULT 'general', -- 'general', 'sport', 'comfort'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for business amenities
CREATE TABLE IF NOT EXISTS business_amenities (
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, amenity_id)
);

-- Enable RLS
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_amenities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Amenities are viewable by everyone" ON amenities FOR SELECT USING (true);
CREATE POLICY "Business amenities are viewable by everyone" ON business_amenities FOR SELECT USING (true);

-- Insert initial catalog (Common amenities)
INSERT INTO amenities (name, icon_key, category) VALUES
    ('Wifi', 'Wifi', 'general'),
    ('Estacionamiento', 'Car', 'general'),
    ('Vestuarios', 'Shirt', 'comfort'),
    ('Duchas', 'ShowerHead', 'comfort'),
    ('Bar / Buffet', 'Coffee', 'general'),
    ('Aire Acondicionado', 'Wind', 'comfort'),
    ('Alquiler de Paletas', 'Trophy', 'sport'),
    ('Iluminación LED', 'Zap', 'sport'),
    ('Escuela / Clases', 'GraduationCap', 'sport'),
    ('Torneos', 'Medal', 'sport'),
    ('Seguridad', 'ShieldCheck', 'general')
ON CONFLICT (name) DO UPDATE SET icon_key = EXCLUDED.icon_key;
