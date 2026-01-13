-- ============================================
-- PASO 1: CREAR SUBCATEGORÍAS DE SALUD
-- Ejecutar PRIMERO antes del seed de negocios
-- ============================================

DO $$
DECLARE
    v_category_salud_id UUID;
BEGIN
    -- Obtener ID de categoría Salud
    SELECT id INTO v_category_salud_id FROM categories WHERE slug = 'salud';
    
    IF v_category_salud_id IS NULL THEN
        RAISE EXCEPTION 'Categoría Salud no encontrada';
    END IF;
    
    -- Crear subcategorías si no existen
    INSERT INTO subcategories (category_id, name, slug, display_order)
    VALUES 
        (v_category_salud_id, 'Kinesiología', 'kinesiologia', 1),
        (v_category_salud_id, 'Nutrición', 'nutricion', 2),
        (v_category_salud_id, 'Psicología', 'psicologia', 3)
    ON CONFLICT (category_id, slug) DO NOTHING;
    
    RAISE NOTICE '✅ Subcategorías de Salud creadas/verificadas';
    
END $$;
