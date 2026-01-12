-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('sport', 'service', 'alquiler')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_business_type ON categories(business_type);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_display_order ON subcategories(display_order);

-- Insert initial categories
INSERT INTO categories (name, slug, icon, color, business_type, display_order) VALUES
  ('Deportes', 'deportes', '⚽', '#00E676', 'sport', 1),
  ('Belleza', 'belleza', '💇‍♀️', '#FF4081', 'service', 2),
  ('Salud', 'salud', '🩺', '#00B0FF', 'service', 3),
  ('Alquileres', 'alquileres', '🏡', '#FF5722', 'alquiler', 4),
  ('Mascotas', 'mascotas', '🐶', '#795548', 'service', 5)
ON CONFLICT (slug) DO NOTHING;
