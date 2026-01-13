-- ============================================
-- CORRECCIÓN: Actualizar relaciones business_subcategories
-- Para usar las subcategorías existentes correctas
-- ============================================

DO $$
DECLARE
    v_category_mascotas_id UUID;
    v_subcat_veterinaria_singular_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_mascotas_id FROM categories WHERE slug = 'mascotas';
    SELECT id INTO v_subcat_veterinaria_singular_id FROM subcategories WHERE slug = 'veterinaria' AND category_id = v_category_mascotas_id;
    
    -- Actualizar negocios de veterinarias para usar 'veterinaria' (singular) en lugar de 'veterinarias' (plural)
    UPDATE business_subcategories 
    SET subcategory_id = v_subcat_veterinaria_singular_id
    WHERE business_id IN ('veterinaria-animal-health', 'veterinaria-mascotas-felices', 'veterinaria-pet-care');
    
    RAISE NOTICE '✅ Relaciones de veterinarias actualizadas a subcategoría correcta';
    
END $$;
