-- ============================================
-- SEED DATA: Categoría BELLEZA
-- 8 negocios con servicios, especialistas y categorías
-- ============================================

-- Variables para IDs (se obtienen dinámicamente)
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
    
    -- Specialist IDs
    v_specialist_id UUID;
    
    -- Service category IDs
    v_cat_tratamientos_faciales UUID;
    v_cat_masajes UUID;
    v_cat_depilacion UUID;
    v_cat_cortes UUID;
    v_cat_coloracion UUID;
    v_cat_tratamientos_capilares UUID;
    v_cat_spa_masajes UUID;
    v_cat_manicura UUID;
    v_cat_pedicura UUID;
    
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
        amenities, hours
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
        )
    );
    
    -- Relación con subcategoría
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_estetica_integral_id, v_subcat_estetica_id);
    
    -- Crear suscripción activa
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date)
    SELECT 
        v_estetica_integral_id,
        sp.name,
        sp.spaces_included,
        sp.price_monthly,
        'active',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        CURRENT_DATE + INTERVAL '30 days'
    FROM subscription_plans sp
    WHERE sp.id = v_plan_trio_id;
    
    -- Crear categorías de servicios para Estética Integral
    INSERT INTO service_categories (business_id, name) VALUES
        (v_estetica_integral_id, 'Tratamientos Faciales') RETURNING id INTO v_cat_tratamientos_faciales;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_estetica_integral_id, 'Masajes') RETURNING id INTO v_cat_masajes;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_estetica_integral_id, 'Depilación') RETURNING id INTO v_cat_depilacion;
    
    -- Crear especialistas para Estética Integral
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_estetica_integral_id, 'Dra. María González', 'Esteticista', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop'),
        (v_estetica_integral_id, 'Lic. Ana Martínez', 'Cosmetóloga', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'),
        (v_estetica_integral_id, 'Laura Pérez', 'Masajista', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop');
    
    -- Crear servicios para Estética Integral
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_estetica_integral_id, 'Limpieza facial profunda', 'Limpieza profunda con extracción de impurezas y mascarilla', 3500, 60, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Tratamiento anti-age', 'Tratamiento completo para reducir arrugas y líneas de expresión', 5000, 90, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Depilación láser facial', 'Depilación definitiva con tecnología láser de última generación', 2500, 30, v_cat_depilacion, 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Masajes reductores', 'Masajes modeladores para reducir medidas y celulitis', 4000, 60, v_cat_masajes, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop'),
        (v_estetica_integral_id, 'Radiofrecuencia corporal', 'Tratamiento de radiofrecuencia para reafirmar la piel', 6000, 75, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Estética Integral creado exitosamente';
    
    -- 2.2 Centro de Estética Belleza Natural
    v_estetica_natural_id := 'estetica-belleza-natural';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours
    ) VALUES (
        v_estetica_natural_id,
        'Centro de Estética Belleza Natural',
        'service',
        v_category_belleza_id,
        v_plan_duo_id,
        'bellezanatural@turnitos.com',
        'belleza123',
        'Calle 25 de Mayo 789, La Rioja',
        -29.4150,
        -66.8570,
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1200&h=400&fit=crop',
        'light',
        '#9C27B0',
        ARRAY['Wifi', 'Aire acondicionado'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:30', 'close', '12:30', 'open2', '15:30', 'close2', '19:30'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:30', 'close', '12:30', 'open2', '15:30', 'close2', '19:30'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:30', 'close', '12:30', 'open2', '15:30', 'close2', '19:30'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:30', 'close', '12:30', 'open2', '15:30', 'close2', '19:30'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:30', 'close', '12:30', 'open2', '15:30', 'close2', '19:30'),
            'saturday', jsonb_build_object('isOpen', false),
            'sunday', jsonb_build_object('isOpen', false)
        )
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_estetica_natural_id, v_subcat_estetica_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT v_estetica_natural_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    
    -- Categorías de servicios
    INSERT INTO service_categories (business_id, name) VALUES
        (v_estetica_natural_id, 'Tratamientos Faciales') RETURNING id INTO v_cat_tratamientos_faciales;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_estetica_natural_id, 'Lic. Carolina Ruiz', 'Esteticista', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop'),
        (v_estetica_natural_id, 'Sofía Díaz', 'Cosmetóloga', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_estetica_natural_id, 'Peeling químico', 'Exfoliación química para renovar la piel', 4500, 45, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=600&fit=crop'),
        (v_estetica_natural_id, 'Microdermoabrasión', 'Tratamiento para mejorar textura y luminosidad', 3800, 50, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&h=600&fit=crop'),
        (v_estetica_natural_id, 'Lifting facial', 'Tratamiento tensor facial sin cirugía', 7000, 90, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=600&fit=crop'),
        (v_estetica_natural_id, 'Drenaje linfático', 'Masaje para eliminar toxinas y reducir retención', 3500, 60, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Centro de Estética Belleza Natural creado exitosamente';
    
    -- ============================================
    -- 3. CREAR NEGOCIOS DE PELUQUERÍA
    -- ============================================
    
    -- 3.1 Peluquería Estilo
    v_peluqueria_estilo_id := 'peluqueria-estilo';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours
    ) VALUES (
        v_peluqueria_estilo_id,
        'Peluquería Estilo',
        'service',
        v_category_belleza_id,
        v_plan_equipo_id,
        'peluqueriaestilo@turnitos.com',
        'estilo123',
        'Av. Ortiz de Ocampo 345, La Rioja',
        -29.4130,
        -66.8550,
        'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=400&fit=crop',
        'light',
        '#FF4081',
        ARRAY['Wifi', 'Aire acondicionado', 'Café'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '20:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '20:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '20:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '20:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '20:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '20:00'),
            'sunday', jsonb_build_object('isOpen', false)
        )
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_peluqueria_estilo_id, v_subcat_peluqueria_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT v_peluqueria_estilo_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_equipo_id;
    
    -- Categorías de servicios
    INSERT INTO service_categories (business_id, name) VALUES
        (v_peluqueria_estilo_id, 'Cortes') RETURNING id INTO v_cat_cortes;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_peluqueria_estilo_id, 'Coloración') RETURNING id INTO v_cat_coloracion;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_peluqueria_estilo_id, 'Tratamientos Capilares') RETURNING id INTO v_cat_tratamientos_capilares;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_peluqueria_estilo_id, 'Gabriela Romero', 'Estilista', 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop'),
        (v_peluqueria_estilo_id, 'Martín Silva', 'Colorista', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'),
        (v_peluqueria_estilo_id, 'Lucía Fernández', 'Estilista', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop'),
        (v_peluqueria_estilo_id, 'Diego Torres', 'Barbero', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_peluqueria_estilo_id, 'Corte dama', 'Corte personalizado según tu estilo', 2500, 45, v_cat_cortes, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop'),
        (v_peluqueria_estilo_id, 'Corte caballero', 'Corte moderno y prolijo', 1800, 30, v_cat_cortes, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&h=600&fit=crop'),
        (v_peluqueria_estilo_id, 'Coloración completa', 'Tintura de raíz a puntas con productos premium', 4500, 120, v_cat_coloracion, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop'),
        (v_peluqueria_estilo_id, 'Alisado permanente', 'Alisado con keratina de larga duración', 8000, 180, v_cat_tratamientos_capilares, 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=600&fit=crop'),
        (v_peluqueria_estilo_id, 'Brushing', 'Secado y peinado profesional', 1500, 30, v_cat_cortes, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop'),
        (v_peluqueria_estilo_id, 'Tratamiento de hidratación', 'Hidratación profunda para cabello dañado', 3500, 60, v_cat_tratamientos_capilares, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Peluquería Estilo creado exitosamente';
    
    -- 3.2 Salón de Belleza Glamour
    v_salon_glamour_id := 'salon-glamour';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours
    ) VALUES (
        v_salon_glamour_id,
        'Salón de Belleza Glamour',
        'service',
        v_category_belleza_id,
        v_plan_duo_id,
        'salonglamour@turnitos.com',
        'glamour123',
        'Calle La Madrid 678, La Rioja',
        -29.4160,
        -66.8580,
        'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=1200&h=400&fit=crop',
        'light',
        '#F06292',
        ARRAY['Wifi', 'Aire acondicionado'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', false),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'sunday', jsonb_build_object('isOpen', false)
        )
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_salon_glamour_id, v_subcat_peluqueria_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT v_salon_glamour_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    
    -- Categorías de servicios
    INSERT INTO service_categories (business_id, name) VALUES
        (v_salon_glamour_id, 'Cortes') RETURNING id INTO v_cat_cortes;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_salon_glamour_id, 'Coloración') RETURNING id INTO v_cat_coloracion;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_salon_glamour_id, 'Valeria Gómez', 'Estilista', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop'),
        (v_salon_glamour_id, 'Roberto Paz', 'Colorista', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_salon_glamour_id, 'Corte dama', 'Corte con asesoramiento de imagen', 2200, 40, v_cat_cortes, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop'),
        (v_salon_glamour_id, 'Corte caballero', 'Corte clásico o moderno', 1500, 25, v_cat_cortes, 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&h=600&fit=crop'),
        (v_salon_glamour_id, 'Tintura', 'Coloración de raíces', 3000, 90, v_cat_coloracion, 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&h=600&fit=crop'),
        (v_salon_glamour_id, 'Mechas', 'Mechas californianas o balayage', 5500, 150, v_cat_coloracion, 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=600&fit=crop'),
        (v_salon_glamour_id, 'Permanente', 'Ondulación permanente', 6000, 120, v_cat_cortes, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Salón de Belleza Glamour creado exitosamente';
    
    -- ============================================
    -- 4. CREAR NEGOCIOS DE SPA
    -- ============================================
    
    -- 4.1 Spa Relax
    v_spa_relax_id := 'spa-relax';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours
    ) VALUES (
        v_spa_relax_id,
        'Spa Relax',
        'service',
        v_category_belleza_id,
        v_plan_equipo_id,
        'sparelax@turnitos.com',
        'relax123',
        'Av. Alem 123, La Rioja',
        -29.4120,
        -66.8540,
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&h=400&fit=crop',
        'light',
        '#00BCD4',
        ARRAY['Wifi', 'Aire acondicionado', 'Música relajante', 'Vestuarios'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '21:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '21:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '21:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '21:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '21:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '21:00'),
            'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '21:00')
        )
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_spa_relax_id, v_subcat_spa_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT v_spa_relax_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_equipo_id;
    
    -- Categorías de servicios
    INSERT INTO service_categories (business_id, name) VALUES
        (v_spa_relax_id, 'Masajes') RETURNING id INTO v_cat_spa_masajes;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_spa_relax_id, 'Tratamientos Corporales') RETURNING id INTO v_cat_tratamientos_faciales;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_spa_relax_id, 'Patricia Morales', 'Masajista', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'),
        (v_spa_relax_id, 'Claudia Vega', 'Terapeuta', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop'),
        (v_spa_relax_id, 'Marcela Sosa', 'Masajista', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'),
        (v_spa_relax_id, 'Romina Castro', 'Esteticista', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_spa_relax_id, 'Masaje relajante', 'Masaje de cuerpo completo con aceites esenciales', 4500, 60, v_cat_spa_masajes, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop'),
        (v_spa_relax_id, 'Masaje descontracturante', 'Masaje terapéutico para aliviar tensiones', 5000, 75, v_cat_spa_masajes, 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&h=600&fit=crop'),
        (v_spa_relax_id, 'Aromaterapia', 'Sesión de aromaterapia con aceites naturales', 3500, 45, v_cat_spa_masajes, 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=600&fit=crop'),
        (v_spa_relax_id, 'Sauna', 'Sesión de sauna seco', 2000, 30, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop'),
        (v_spa_relax_id, 'Jacuzzi', 'Sesión de hidromasaje', 2500, 30, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop'),
        (v_spa_relax_id, 'Exfoliación corporal', 'Exfoliación completa con productos naturales', 4000, 60, v_cat_tratamientos_faciales, 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Spa Relax creado exitosamente';
    
    -- 4.2 Spa Zen
    v_spa_zen_id := 'spa-zen';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours
    ) VALUES (
        v_spa_zen_id,
        'Spa Zen',
        'service',
        v_category_belleza_id,
        v_plan_trio_id,
        'spazen@turnitos.com',
        'zen123',
        'Barrio Jardín, La Rioja',
        -29.4170,
        -66.8590,
        'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=400&fit=crop',
        'light',
        '#009688',
        ARRAY['Wifi', 'Aire acondicionado', 'Té de cortesía'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '10:00', 'close', '14:00', 'open2', '17:00', 'close2', '21:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '10:00', 'close', '14:00', 'open2', '17:00', 'close2', '21:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '10:00', 'close', '14:00', 'open2', '17:00', 'close2', '21:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '10:00', 'close', '14:00', 'open2', '17:00', 'close2', '21:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '10:00', 'close', '14:00', 'open2', '17:00', 'close2', '21:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '10:00', 'close', '14:00', 'open2', '17:00', 'close2', '21:00'),
            'sunday', jsonb_build_object('isOpen', false)
        )
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_spa_zen_id, v_subcat_spa_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT v_spa_zen_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    
    -- Categorías de servicios
    INSERT INTO service_categories (business_id, name) VALUES
        (v_spa_zen_id, 'Masajes') RETURNING id INTO v_cat_spa_masajes;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_spa_zen_id, 'Elena Ramírez', 'Masajista', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop'),
        (v_spa_zen_id, 'Daniela Ortiz', 'Reflexóloga', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop'),
        (v_spa_zen_id, 'Natalia Herrera', 'Terapeuta', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_spa_zen_id, 'Masaje con piedras calientes', 'Masaje terapéutico con piedras volcánicas', 6000, 90, v_cat_spa_masajes, 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&h=600&fit=crop'),
        (v_spa_zen_id, 'Reflexología', 'Masaje de pies y manos con puntos de presión', 3500, 45, v_cat_spa_masajes, 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&h=600&fit=crop'),
        (v_spa_zen_id, 'Exfoliación corporal', 'Peeling corporal con sales marinas', 4500, 60, v_cat_spa_masajes, 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=600&fit=crop'),
        (v_spa_zen_id, 'Hidroterapia', 'Circuito de hidroterapia completo', 5000, 60, v_cat_spa_masajes, 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Spa Zen creado exitosamente';
    
    -- ============================================
    -- 5. CREAR NEGOCIOS DE MANICURA
    -- ============================================
    
    -- 5.1 Nails Art Studio
    v_nails_art_id := 'nails-art-studio';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours
    ) VALUES (
        v_nails_art_id,
        'Nails Art Studio',
        'service',
        v_category_belleza_id,
        v_plan_duo_id,
        'nailsart@turnitos.com',
        'nails123',
        'Av. Ramírez de Velasco 456, La Rioja',
        -29.4145,
        -66.8565,
        'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=1200&h=400&fit=crop',
        'light',
        '#E91E63',
        ARRAY['Wifi', 'Aire acondicionado'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '14:00'),
            'sunday', jsonb_build_object('isOpen', false)
        )
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_nails_art_id, v_subcat_manicura_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT v_nails_art_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    
    -- Categorías de servicios
    INSERT INTO service_categories (business_id, name) VALUES
        (v_nails_art_id, 'Manicura') RETURNING id INTO v_cat_manicura;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_nails_art_id, 'Pedicura') RETURNING id INTO v_cat_pedicura;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_nails_art_id, 'Yamila López', 'Manicurista', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop'),
        (v_nails_art_id, 'Florencia Arias', 'Nail Artist', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_nails_art_id, 'Manicura clásica', 'Limado, cutículas y esmaltado tradicional', 1500, 30, v_cat_manicura, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=600&fit=crop'),
        (v_nails_art_id, 'Manicura semipermanente', 'Esmaltado de larga duración', 2500, 45, v_cat_manicura, 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&h=600&fit=crop'),
        (v_nails_art_id, 'Pedicura spa', 'Pedicura completa con exfoliación e hidratación', 2800, 60, v_cat_pedicura, 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&h=600&fit=crop'),
        (v_nails_art_id, 'Uñas esculpidas', 'Extensión de uñas con gel', 4000, 90, v_cat_manicura, 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&h=600&fit=crop'),
        (v_nails_art_id, 'Nail art', 'Diseño personalizado en uñas', 3500, 60, v_cat_manicura, 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Nails Art Studio creado exitosamente';
    
    -- 5.2 Beauty Nails
    v_beauty_nails_id := 'beauty-nails';
    INSERT INTO businesses (
        id, name, type, category_id, subscription_plan_id,
        email, password, location, latitude, longitude,
        logo, banner_image, theme, primary_color,
        amenities, hours
    ) VALUES (
        v_beauty_nails_id,
        'Beauty Nails',
        'service',
        v_category_belleza_id,
        v_plan_trio_id,
        'beautynails@turnitos.com',
        'beauty123',
        'Calle Belgrano 890, La Rioja',
        -29.4135,
        -66.8555,
        'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=1200&h=400&fit=crop',
        'light',
        '#FF80AB',
        ARRAY['Wifi', 'Aire acondicionado', 'Música'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', false),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '19:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '19:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '19:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '19:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '19:00'),
            'sunday', jsonb_build_object('isOpen', false)
        )
    );
    
    INSERT INTO business_subcategories (business_id, subcategory_id)
    VALUES (v_beauty_nails_id, v_subcat_manicura_id);
    
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT v_beauty_nails_id, sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    
    -- Categorías de servicios
    INSERT INTO service_categories (business_id, name) VALUES
        (v_beauty_nails_id, 'Manicura') RETURNING id INTO v_cat_manicura;
    INSERT INTO service_categories (business_id, name) VALUES
        (v_beauty_nails_id, 'Pedicura') RETURNING id INTO v_cat_pedicura;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, specialty, image)
    VALUES 
        (v_beauty_nails_id, 'Micaela Rojas', 'Manicurista', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'),
        (v_beauty_nails_id, 'Celeste Navarro', 'Nail Artist', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&h=400&fit=crop'),
        (v_beauty_nails_id, 'Agustina Molina', 'Manicurista', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category_id, image)
    VALUES
        (v_beauty_nails_id, 'Esmaltado permanente', 'Gel polish de larga duración', 2200, 40, v_cat_manicura, 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&h=600&fit=crop'),
        (v_beauty_nails_id, 'Kapping gel', 'Refuerzo de uñas con gel', 3500, 60, v_cat_manicura, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=600&fit=crop'),
        (v_beauty_nails_id, 'Soft gel', 'Extensión suave de uñas', 4500, 90, v_cat_manicura, 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&h=600&fit=crop'),
        (v_beauty_nails_id, 'Decoración de uñas', 'Diseños artísticos personalizados', 3000, 50, v_cat_manicura, 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&h=600&fit=crop'),
        (v_beauty_nails_id, 'Tratamiento de cutículas', 'Cuidado intensivo de cutículas', 1800, 30, v_cat_manicura, 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&h=600&fit=crop');
    
    RAISE NOTICE 'Beauty Nails creado exitosamente';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '8 negocios de Belleza creados';
    RAISE NOTICE '========================================';
    
END $$;


