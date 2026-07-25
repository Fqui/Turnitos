-- 1. Agregar columnas a la tabla 'promotions' para vincular con deportes o servicios y definir descuentos
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS sport_type text;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage'; -- 'percentage' o 'fixed'
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;

-- 2. Agregar columnas a la tabla 'bookings' para registrar la promoción y el descuento aplicado en cada reserva
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_id uuid REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0;
