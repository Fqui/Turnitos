-- Tabla de productos de la tienda del negocio
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'General',
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) opcional o permisos de lectura pública
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de productos activos" ON store_products
    FOR SELECT USING (true);

CREATE POLICY "Escritura para usuarios autenticados" ON store_products
    FOR ALL USING (auth.role() = 'authenticated');
