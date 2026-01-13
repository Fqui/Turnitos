-- ============================================
-- CORRECCIÓN: Cambiar promotions.business_id a TEXT
-- ============================================

DO $$
BEGIN
    -- 1. Eliminar FK
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'promotions_business_id_fkey'
    ) THEN
        ALTER TABLE promotions DROP CONSTRAINT promotions_business_id_fkey;
    END IF;

    -- 2. Cambiar columna a TEXT
    ALTER TABLE promotions ALTER COLUMN business_id TYPE TEXT USING business_id::text;

    -- 3. Restaurar FK
    ALTER TABLE promotions 
    ADD CONSTRAINT promotions_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Tipo de columna cambiado EXITOSAMENTE';

END $$;
