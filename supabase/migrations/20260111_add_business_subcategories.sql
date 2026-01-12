-- Crear tabla de relación muchos-a-muchos para subcategorías
CREATE TABLE IF NOT EXISTS business_subcategories (
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (business_id, subcategory_id)
);

-- Crear índices para mejorar performance de queries
CREATE INDEX IF NOT EXISTS idx_business_subcategories_business 
ON business_subcategories(business_id);

CREATE INDEX IF NOT EXISTS idx_business_subcategories_subcategory 
ON business_subcategories(subcategory_id);

-- Nota: No hay datos existentes para migrar (fueron eliminados)
-- La tabla está lista para recibir nuevos datos cuando se creen negocios

-- Comentario: NO eliminamos las columnas category_id y subcategory_id aún
-- Las mantendremos por compatibilidad hasta verificar que todo funciona
-- Para eliminarlas más adelante, ejecutar:
-- ALTER TABLE businesses DROP COLUMN category_id;
-- ALTER TABLE businesses DROP COLUMN subcategory_id;
