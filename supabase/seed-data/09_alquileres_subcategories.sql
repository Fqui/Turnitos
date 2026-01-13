-- ============================================
-- PASO 1: CREAR SUBCATEGORÍAS DE ALQUILERES
-- Ejecutar PRIMERO antes del seed de negocios
-- ============================================

DO $$
DECLARE
    v_category_alquileres_id UUID;
BEGIN
    -- Obtener ID de categoría Alquileres
    SELECT id INTO v_category_alquileres_id FROM categories WHERE slug = 'alquileres';
    
    IF v_category_alquileres_id IS NULL THEN
        RAISE EXCEPTION 'Categoría Alquileres no encontrada';
    END IF;
    
    -- Crear subcategorías si no existen
    INSERT INTO subcategories (category_id, name, slug, display_order)
    VALUES 
        (v_category_alquileres_id, 'Salones de eventos', 'salones-eventos', 1),
        (v_category_alquileres_id, 'Quinchos', 'quinchos', 2)
    ON CONFLICT (category_id, slug) DO NOTHING;
    
    RAISE NOTICE '✅ Subcategorías de Alquileres creadas/verificadas';
    
END $$;
