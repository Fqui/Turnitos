-- ============================================
-- CORRECCIÓN COMPLETA: Actualizar todas las relaciones
-- Para usar subcategorías existentes
-- ============================================

DO $$
DECLARE
    v_category_salud_id UUID;
    v_category_alquileres_id UUID;
    v_category_mascotas_id UUID;
    v_subcat_kinesiologia_id UUID;
    v_subcat_nutricion_id UUID;
    v_subcat_psicologia_id UUID;
    v_subcat_salones_id UUID;
    v_subcat_quinchos_id UUID;
    v_subcat_veterinaria_id UUID;
    v_subcat_peluqueria_canina_id UUID;
    
BEGIN
    -- Obtener IDs de categorías
    SELECT id INTO v_category_salud_id FROM categories WHERE slug = 'salud';
    SELECT id INTO v_category_alquileres_id FROM categories WHERE slug = 'alquileres';
    SELECT id INTO v_category_mascotas_id FROM categories WHERE slug = 'mascotas';
    
    -- Obtener IDs de subcategorías EXISTENTES
    SELECT id INTO v_subcat_kinesiologia_id FROM subcategories WHERE slug = 'kinesiologia' AND category_id = v_category_salud_id LIMIT 1;
    SELECT id INTO v_subcat_nutricion_id FROM subcategories WHERE slug = 'nutricion' AND category_id = v_category_salud_id LIMIT 1;
    SELECT id INTO v_subcat_psicologia_id FROM subcategories WHERE slug = 'psicologia' AND category_id = v_category_salud_id LIMIT 1;
    SELECT id INTO v_subcat_salones_id FROM subcategories WHERE slug = 'salones-eventos' AND category_id = v_category_alquileres_id LIMIT 1;
    SELECT id INTO v_subcat_quinchos_id FROM subcategories WHERE slug = 'quinchos' AND category_id = v_category_alquileres_id LIMIT 1;
    SELECT id INTO v_subcat_veterinaria_id FROM subcategories WHERE slug = 'veterinaria' AND category_id = v_category_mascotas_id LIMIT 1;
    SELECT id INTO v_subcat_peluqueria_canina_id FROM subcategories WHERE slug = 'peluqueria-canina' AND category_id = v_category_mascotas_id LIMIT 1;
    
    -- SALUD: Actualizar o insertar relaciones
    -- Kinesiología
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES 
        ('centro-kinesio-movimiento', v_subcat_kinesiologia_id),
        ('kinesio-salud', v_subcat_kinesiologia_id)
    ON CONFLICT (business_id, subcategory_id) DO NOTHING;
    
    -- Nutrición
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES 
        ('nutricion-integral', v_subcat_nutricion_id),
        ('nutricion-vida-sana', v_subcat_nutricion_id)
    ON CONFLICT (business_id, subcategory_id) DO NOTHING;
    
    -- Psicología
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES 
        ('psico-mente-sana', v_subcat_psicologia_id),
        ('psico-bienestar', v_subcat_psicologia_id)
    ON CONFLICT (business_id, subcategory_id) DO NOTHING;
    
    -- ALQUILERES: Actualizar o insertar relaciones
    -- Salones
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES 
        ('salon-gran-fiesta', v_subcat_salones_id),
        ('salon-imperial', v_subcat_salones_id),
        ('salon-eventos-elegance', v_subcat_salones_id)
    ON CONFLICT (business_id, subcategory_id) DO NOTHING;
    
    -- Quinchos
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES 
        ('quincho-los-aromos', v_subcat_quinchos_id)
    ON CONFLICT (business_id, subcategory_id) DO NOTHING;
    
    -- MASCOTAS: Actualizar o insertar relaciones
    -- Veterinarias
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES 
        ('veterinaria-animal-health', v_subcat_veterinaria_id),
        ('veterinaria-mascotas-felices', v_subcat_veterinaria_id),
        ('veterinaria-pet-care', v_subcat_veterinaria_id)
    ON CONFLICT (business_id, subcategory_id) DO NOTHING;
    
    -- Peluquería Canina
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES 
        ('peluqueria-glamour-pets', v_subcat_peluqueria_canina_id)
    ON CONFLICT (business_id, subcategory_id) DO NOTHING;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Todas las relaciones actualizadas';
    RAISE NOTICE 'Salud: 6 negocios';
    RAISE NOTICE 'Alquileres: 4 negocios';
    RAISE NOTICE 'Mascotas: 4 negocios';
    RAISE NOTICE '========================================';
    
END $$;
