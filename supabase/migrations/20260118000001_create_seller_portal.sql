-- Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add seller-related columns to businesses table
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS seller_id TEXT REFERENCES sellers(id),
  ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_cycle TEXT CHECK (payment_cycle IN ('monthly', 'quarterly')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'inactive', 'cancelled'));

-- Create subscription_payments table (using TEXT for business_id to match businesses.id)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  business_id TEXT REFERENCES businesses(id) NOT NULL,
  subscription_plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  payment_cycle TEXT CHECK (payment_cycle IN ('monthly', 'quarterly')),
  months_covered INTEGER DEFAULT 1,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create seller_commissions table (using TEXT for seller_id and business_id)
CREATE TABLE IF NOT EXISTS seller_commissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  seller_id TEXT REFERENCES sellers(id) NOT NULL,
  business_id TEXT REFERENCES businesses(id) NOT NULL,
  payment_id TEXT REFERENCES subscription_payments(id) NOT NULL,
  subscription_month INTEGER NOT NULL,
  base_commission_rate DECIMAL(5,2) NOT NULL,
  volume_bonus DECIMAL(5,2) DEFAULT 0,
  total_commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  active_clients_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_seller_id ON businesses(seller_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_business_id ON subscription_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_seller_commissions_seller ON seller_commissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_commissions_period ON seller_commissions(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_seller_commissions_business ON seller_commissions(business_id);

-- Add comment for documentation
COMMENT ON TABLE sellers IS 'Vendedores que gestionan negocios clientes';
COMMENT ON TABLE subscription_payments IS 'Registro de pagos de suscripciones con descuentos';
COMMENT ON TABLE seller_commissions IS 'Comisiones de vendedores con estructura decreciente (40%/30%/20%/10%)';
COMMENT ON COLUMN businesses.trial_start_date IS 'Inicio del período de prueba de 15 días';
COMMENT ON COLUMN businesses.trial_end_date IS 'Fin del período de prueba (trial_start_date + 15 días)';
COMMENT ON COLUMN businesses.subscription_start_date IS 'Fecha del primer pago de suscripción';
COMMENT ON COLUMN seller_commissions.subscription_month IS 'Mes de suscripción del negocio (1=40%, 2=30%, 3=20%, 4-6=10%, 7+=0%)';
COMMENT ON COLUMN seller_commissions.volume_bonus IS 'Bonus del 5% si el vendedor tiene 50+ clientes activos';
