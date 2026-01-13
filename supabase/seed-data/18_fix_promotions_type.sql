-- ============================================
-- CORRECCIÓN: Cambiar promotions.business_id a TEXT
-- Para que coincida con businesses.id que es TEXT
-- ============================================

-- Primero eliminamos la foreign key si existe
ALTER TABLE promotions DROP CONSTRAINT IF EXISTS promotions_business_id_fkey;

-- Cambiamos el tipo de dato
ALTER TABLE promotions ALTER COLUMN business_id TYPE TEXT;

-- Volvemos a agregar la FK
ALTER TABLE promotions 
ADD CONSTRAINT promotions_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;


