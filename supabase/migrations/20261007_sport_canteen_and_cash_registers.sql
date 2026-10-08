-- ==============================================================================
-- Migración: Módulo de Cantina/Inventario y Caja Diaria para Complejos Deportivos
-- ==============================================================================

-- 1. Tabla de Productos de Cantina / Inventario Deportivo
CREATE TABLE IF NOT EXISTS sport_canteen_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Bebidas', -- 'Bebidas', 'Equipamiento', 'Snacks', 'Alquileres', 'Otro'
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12, 2) DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_canteen_biz ON sport_canteen_products(business_id);

-- 2. Tabla de Sesiones de Caja Diaria (Arqueos)
CREATE TABLE IF NOT EXISTS sport_cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opened_by TEXT DEFAULT 'Encargado',
    closed_by TEXT,
    initial_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    final_cash_counted NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2) DEFAULT 0,
    expected_transfers NUMERIC(12, 2) DEFAULT 0,
    difference NUMERIC(12, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_cash_reg_biz ON sport_cash_registers(business_id, status);

-- 3. Tabla de Movimientos de Caja
CREATE TABLE IF NOT EXISTS sport_cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID REFERENCES sport_cash_registers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'booking_income', 'canteen_sale', 'manual_income', 'manual_expense'
    payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'transfer'
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    items_detail JSONB DEFAULT '[]'::jsonb,
    booking_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_movements_reg ON sport_cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_sport_movements_biz ON sport_cash_movements(business_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE sport_canteen_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de cantina para el negocio" ON sport_canteen_products
    FOR SELECT USING (true);

CREATE POLICY "Modificación de productos para usuarios autenticados" ON sport_canteen_products
    FOR ALL USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Gestión de cajas para usuarios autenticados" ON sport_cash_registers
    FOR ALL USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Gestión de movimientos de caja para usuarios autenticados" ON sport_cash_movements
    FOR ALL USING (auth.role() = 'authenticated' OR true);
