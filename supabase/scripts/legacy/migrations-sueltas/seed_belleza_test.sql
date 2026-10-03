-- ============================================
-- SEED DATA: Categoría BELLEZA
-- 8 negocios con servicios y especialistas
-- ============================================

DO $$
DECLARE
    v_category_belleza_id UUID;
    v_subcat_estetica_id UUID;
    v_subcat_peluqueria_id UUID;
    v_subcat_spa_id UUID;
    v_subcat_manicura_id UUID;
    v_plan_duo_id UUID;
    v_plan_trio_id UUID;
    v_plan_equipo_id UUID;
    
    -- Business IDs
    v_estetica_integral_id TEXT;
    v_estetica_natural_id TEXT;
    v_peluqueria_estilo_id TEXT;
    v_salon_glamour_id TEXT;
    v_spa_relax_id TEXT;
    v_spa_zen_id TEXT;
    v_nails_art_id TEXT;
    v_beauty_nails_id TEXT;
    
BEGIN
    -- ============================================
    -- 1. OBTENER IDs DE CATEGORÍAS Y SUBCATEGORÍAS
    -- ============================================
    SELECT id INTO v_category_belleza_id FROM categories WHERE slug = 'belleza';
    SELECT id INTO v_subcat_estetica_id FROM subcategories WHERE slug = 'estetica' AND category_id = v_category_belleza_id;
    SELECT id INTO v_subcat_peluqueria_id FROM subcategories WHERE slug = 'peluqueria' AND category_id = v_category_belleza_id;
    SELECT id INTO v_subcat_spa_id FROM subcategories WHERE slug = 'spa' AND category_id = v_category_belleza_id;
    SELECT id INTO v_subcat_manicura_id FROM subcategories WHERE slug = 'manicura' AND category_id = v_category_belleza_id;
    
    -- Obtener IDs de planes de suscripción
    SELECT id INTO v_plan_duo_id FROM subscription_plans WHERE name = 'Dúo' AND business_type = 'service';
    SELECT id INTO v_plan_trio_id FROM subscription_plans WHERE name = 'Trío' AND business_type = 'service';
    SELECT id INTO v_plan_equipo_id FROM subscription_plans WHERE name = 'Equipo' AND business_type = 'service';
    
    RAISE NOTICE 'IDs obtenidos correctamente';
    
    -- ============================================
    -- 2. CREAR NEGOCIOS DE ESTÉTICA
    -- ============================================
    
    -- 2.1 Estética Integral
    v_estetica_integral_id := 'estetica-integral';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours, service_categories
    ) VALUES (
        v_estetica_integral_id,
        'Estética Integral',
        'service',
        v_category_belleza_id,
        v_plan_trio_id,
        'esteticaintegral@turnitos.com',
        'estetica123',
        'Av. Hipólito Yrigoyen 234, La Rioja',
        -29.4140,
        -66.8560,
        'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&h=400&fit=crop',
        'light',
        '#E91E63',
        ARRAY['Wifi', 'Aire acondicionado', 'Música ambiental'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '13:00'),
            'sunday', jsonb_build_object('isOpen', false)
        ),
        ARRAY['Tratamientos Faciales', 'Masajes', 'Depilación']
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_estetica_integral_id, v_subcat_estetica_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date)
    SELECT v_estetica_integral_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days'
    FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    
    INSERT INTO specialists (business_id, name, role, avatar_url)
    VALUES 
        (v_estetica_integral_id, 'Dra. María González', 'Esteticista', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop'),
        (v_estetica_integral_id, 'Lic. Ana Martínez', 'Cosmetóloga', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'),
        (v_estetica_integral_id, 'Laura Pérez', 'Masajista', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop');
    
    INSERT INTO services (business_id, name, description, price, duration, category, image_url)
    VALUES
        (v_estetica_integral_id, 'Limpieza facial profunda', 'Limpieza profunda con extracción de impurezas y mascarilla', 3500, 60, 'Tratamientos Faciales', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Tratamiento anti-age', 'Tratamiento completo para reducir arrugas y líneas de expresión', 5000, 90, 'Tratamientos Faciales', 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Depilación láser facial', 'Depilación definitiva con tecnología láser de última generación', 2500, 30, 'Depilación', 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Masajes reductores', 'Masajes modeladores para reducir medidas y celulitis', 4000, 60, 'Masajes', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Radiofrecuencia corporal', 'Tratamiento de radiofrecuencia para reafirmar la piel', 6000, 75, 'Tratamientos Faciales', 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Estética Integral creado exitosamente';
    
    -- Continuar con los demás negocios...
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA PARCIAL COMPLETADO';
    RAISE NOTICE '1 negocio de Belleza creado (Estética Integral)';
    RAISE NOTICE 'Ejecuta este script primero para verificar que funciona';
    RAISE NOTICE '========================================';
    
END $$;
