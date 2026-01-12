-- FIX: Recrear tabla business_subcategories con el tipo de dato correcto (TEXT para business_id)
-- Ejecutar este script en Supabase SQL Editor

DROP TABLE IF EXISTS business_subcategories;

CREATE TABLE business_subcategories (
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (business_id, subcategory_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_business_subcategories_business ON business_subcategories(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subcategories_subcategory ON business_subcategories(subcategory_id);

-- Verificar
SELECT 'Tabla business_subcategories creada correctamente (business_id: TEXT)' as status;
