-- ============================================
-- CREAR SUBCATEGORÍAS DE BELLEZA
-- ============================================

DO $$
DECLARE
    v_category_belleza_id UUID;
BEGIN
    -- Obtener ID de categoría Belleza
    SELECT id INTO v_category_belleza_id FROM categories WHERE slug = 'belleza';
    
    IF v_category_belleza_id IS NULL THEN
        RAISE EXCEPTION 'Categoría Belleza no encontrada';
    END IF;
    
    -- Crear subcategorías si no existen
    INSERT INTO subcategories (category_id, name, slug, display_order)
    VALUES 
        (v_category_belleza_id, 'Estética', 'estetica', 1),
        (v_category_belleza_id, 'Peluquería', 'peluqueria', 2),
        (v_category_belleza_id, 'Spa', 'spa', 3),
        (v_category_belleza_id, 'Manicura', 'manicura', 4)
    ON CONFLICT (category_id, slug) DO NOTHING;
    
    RAISE NOTICE 'Subcategorías de Belleza creadas/verificadas';
    
END $$;
