-- Drop and recreate subscription_plans table with correct structure
DROP TABLE IF EXISTS subscription_plans CASCADE;

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('sport', 'service', 'alquiler')),
  spaces_included INTEGER NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  promotional_price DECIMAL(10,2),
  is_per_unit BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for filtering by business type
CREATE INDEX idx_subscription_plans_business_type 
ON subscription_plans(business_type, display_order);

-- Insert new subscription plans for DEPORTES (sport)
INSERT INTO subscription_plans (name, business_type, spaces_included, price_monthly, promotional_price, is_per_unit, display_order) VALUES
  ('1 Cancha', 'sport', 1, 15000.00, 12000.00, false, 1),
  ('2 Canchas', 'sport', 2, 25000.00, 20000.00, false, 2),
  ('3 Canchas', 'sport', 3, 30000.00, 24000.00, false, 3),
  ('Por Cancha Adicional', 'sport', 1, 7500.00, 6000.00, true, 4);

-- Insert subscription plans for SERVICIOS (service)
INSERT INTO subscription_plans (name, business_type, spaces_included, price_monthly, promotional_price, is_per_unit, display_order) VALUES
  ('Individual', 'service', 1, 15000.00, 12000.00, false, 1),
  ('Dúo', 'service', 2, 24000.00, 19200.00, false, 2),
  ('Trío', 'service', 3, 30000.00, 24000.00, false, 3),
  ('Equipo', 'service', 4, 32000.00, 25600.00, false, 4),
  ('Por Especialista Adicional', 'service', 1, 7000.00, 5600.00, true, 5);

-- Insert subscription plan for ALQUILERES (alquiler)
INSERT INTO subscription_plans (name, business_type, spaces_included, price_monthly, promotional_price, is_per_unit, display_order) VALUES
  ('Espacio Completo', 'alquiler', 1, 13000.00, 10400.00, false, 1);
