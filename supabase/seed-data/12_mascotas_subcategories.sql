-- ============================================
-- PASO 1: CREAR SUBCATEGORÍAS DE MASCOTAS
-- Ejecutar PRIMERO antes del seed de negocios
-- ============================================

DO $$
DECLARE
    v_category_mascotas_id UUID;
BEGIN
    -- Obtener ID de categoría Mascotas
    SELECT id INTO v_category_mascotas_id FROM categories WHERE slug = 'mascotas';
    
    IF v_category_mascotas_id IS NULL THEN
        RAISE EXCEPTION 'Categoría Mascotas no encontrada';
    END IF;
    
    -- Crear subcategorías si no existen
    INSERT INTO subcategories (category_id, name, slug, display_order)
    VALUES 
        (v_category_mascotas_id, 'Veterinarias', 'veterinarias', 1),
        (v_category_mascotas_id, 'Peluquería canina', 'peluqueria-canina', 2)
    ON CONFLICT (category_id, slug) DO NOTHING;
    
    RAISE NOTICE '✅ Subcategorías de Mascotas creadas/verificadas';
    
END $$;
