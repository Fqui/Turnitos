-- ============================================
-- PASO 1: CREAR SUBCATEGORÍAS DE DEPORTES
-- Ejecutar PRIMERO antes del seed de negocios
-- ============================================

DO $$
DECLARE
    v_category_deportes_id UUID;
BEGIN
    -- Obtener ID de categoría Deportes
    SELECT id INTO v_category_deportes_id FROM categories WHERE slug = 'deportes';
    
    IF v_category_deportes_id IS NULL THEN
        RAISE EXCEPTION 'Categoría Deportes no encontrada';
    END IF;
    
    -- Crear subcategorías si no existen
    INSERT INTO subcategories (category_id, name, slug, display_order)
    VALUES 
        (v_category_deportes_id, 'Pádel', 'padel', 1),
        (v_category_deportes_id, 'Fútbol', 'futbol', 2)
    ON CONFLICT (category_id, slug) DO NOTHING;
    
    RAISE NOTICE '✅ Subcategorías de Deportes creadas/verificadas';
    
END $$;
