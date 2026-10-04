-- Agregar columna store_enabled a la tabla businesses
-- Por defecto es FALSE (ningún negocio tiene tienda)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN DEFAULT false;

-- Habilitar la tienda SOLO para Cancha Apolo
UPDATE businesses SET store_enabled = true WHERE slug = 'cancha-apolo';
