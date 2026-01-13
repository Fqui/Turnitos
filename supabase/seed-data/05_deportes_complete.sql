-- ============================================
-- SEED DATA: Categoría DEPORTES - COMPLETO
-- 5 negocios con canchas (2 Pádel, 3 Fútbol)
-- ============================================

DO $$
DECLARE
    v_category_deportes_id UUID;
    v_subcat_padel_id UUID;
    v_subcat_futbol_id UUID;
    v_plan_1_cancha_id UUID;
    v_plan_2_canchas_id UUID;
    v_plan_3_canchas_id UUID;
    v_plan_adicional_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_deportes_id FROM categories WHERE slug = 'deportes';
    SELECT id INTO v_subcat_padel_id FROM subcategories WHERE slug = 'padel' AND category_id = v_category_deportes_id;
    SELECT id INTO v_subcat_futbol_id FROM subcategories WHERE slug = 'futbol' AND category_id = v_category_deportes_id;
    SELECT id INTO v_plan_1_cancha_id FROM subscription_plans WHERE name = '1 Cancha' AND business_type = 'sport';
    SELECT id INTO v_plan_2_canchas_id FROM subscription_plans WHERE name = '2 Canchas' AND business_type = 'sport';
    SELECT id INTO v_plan_3_canchas_id FROM subscription_plans WHERE name = '3 Canchas' AND business_type = 'sport';
    SELECT id INTO v_plan_adicional_id FROM subscription_plans WHERE name = 'Por Cancha Adicional' AND business_type = 'sport';
    
    -- ============================================
    -- 1. PADEL CLUB LA RIOJA (4 canchas)
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('padel-club-la-rioja', 'Padel Club La Rioja', 'sport', v_category_deportes_id, v_plan_adicional_id, 'padelclub@turnitos.com', 'padel123', 'Av. Rivadavia 1234, La Rioja', -29.4135, -66.8558,
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=1200&h=400&fit=crop', 'light', '#00E676',
        ARRAY['Wifi', 'Estacionamiento', 'Vestuarios', 'Cantina'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '21:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '21:00')));
    INSERT INTO business_subcategories VALUES ('padel-club-la-rioja', v_subcat_padel_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'padel-club-la-rioja', sp.name, 4, sp.price_monthly * 4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_adicional_id;
    INSERT INTO courts (id, business_id, name, sport, price) VALUES (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 1', 'padel', 8000), (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 2', 'padel', 8000), (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 3', 'padel', 8000), (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 4', 'padel', 9000);
    
    -- ============================================
    -- 2. PADEL CENTER (2 canchas)
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('padel-center', 'Padel Center', 'sport', v_category_deportes_id, v_plan_2_canchas_id, 'padelcenter@turnitos.com', 'center123', 'Calle San Martín 567, La Rioja', -29.4145, -66.8568,
        'https://images.unsplash.com/photo-1617883861744-1e0d0d140fe9?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&h=400&fit=crop', 'light', '#2196F3',
        ARRAY['Wifi', 'Aire acondicionado', 'Vestuarios'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '07:00', 'close', '23:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '07:00', 'close', '23:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '07:00', 'close', '23:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '07:00', 'close', '23:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '07:00', 'close', '23:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '07:00', 'close', '23:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '07:00', 'close', '23:00')));
    INSERT INTO business_subcategories VALUES ('padel-center', v_subcat_padel_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'padel-center', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_2_canchas_id;
    INSERT INTO courts (id, business_id, name, sport, price) VALUES (gen_random_uuid(), 'padel-center', 'Cancha 1', 'padel', 7500), (gen_random_uuid(), 'padel-center', 'Cancha 2', 'padel', 7500);
    
    -- ============================================
    -- 3. COMPLEJO DEPORTIVO EL GOL (6 canchas fútbol)
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('complejo-el-gol', 'Complejo Deportivo El Gol', 'sport', v_category_deportes_id, v_plan_adicional_id, 'elgol@turnitos.com', 'gol123', 'Av. Perón 890, La Rioja', -29.4125, -66.8548,
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1200&h=400&fit=crop', 'light', '#4CAF50',
        ARRAY['Wifi', 'Estacionamiento', 'Vestuarios', 'Buffet', 'Iluminación'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '06:00', 'close', '00:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '06:00', 'close', '00:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '06:00', 'close', '00:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '06:00', 'close', '00:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '06:00', 'close', '00:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '06:00', 'close', '00:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '06:00', 'close', '00:00')));
    INSERT INTO business_subcategories VALUES ('complejo-el-gol', v_subcat_futbol_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'complejo-el-gol', sp.name, 6, sp.price_monthly * 6, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_adicional_id;
    INSERT INTO courts (id, business_id, name, sport, price) VALUES (gen_random_uuid(), 'complejo-el-gol', 'Cancha 1', 'futbol', 12000), (gen_random_uuid(), 'complejo-el-gol', 'Cancha 2', 'futbol', 12000), (gen_random_uuid(), 'complejo-el-gol', 'Cancha 3', 'futbol', 15000), (gen_random_uuid(), 'complejo-el-gol', 'Cancha 4', 'futbol', 15000), (gen_random_uuid(), 'complejo-el-gol', 'Cancha 5', 'futbol', 20000), (gen_random_uuid(), 'complejo-el-gol', 'Cancha 6', 'futbol', 20000);
    
    -- ============================================
    -- 4. FÚTBOL 5 LA CANCHA (3 canchas)
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('futbol-5-la-cancha', 'Fútbol 5 La Cancha', 'sport', v_category_deportes_id, v_plan_3_canchas_id, 'lacancha@turnitos.com', 'cancha123', 'Barrio Cochangasta, La Rioja', -29.4155, -66.8578,
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1200&h=400&fit=crop', 'light', '#FF9800',
        ARRAY['Estacionamiento', 'Vestuarios', 'Parrilla'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '16:00', 'close', '00:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '16:00', 'close', '00:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '16:00', 'close', '00:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '16:00', 'close', '00:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '16:00', 'close', '00:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '00:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '00:00')));
    INSERT INTO business_subcategories VALUES ('futbol-5-la-cancha', v_subcat_futbol_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'futbol-5-la-cancha', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_3_canchas_id;
    INSERT INTO courts (id, business_id, name, sport, price) VALUES (gen_random_uuid(), 'futbol-5-la-cancha', 'Cancha 1', 'futbol', 10000), (gen_random_uuid(), 'futbol-5-la-cancha', 'Cancha 2', 'futbol', 10000), (gen_random_uuid(), 'futbol-5-la-cancha', 'Cancha 3', 'futbol', 11000);
    
    -- ============================================
    -- 5. ARENA FÚTBOL (2 canchas)
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('arena-futbol', 'Arena Fútbol', 'sport', v_category_deportes_id, v_plan_2_canchas_id, 'arenafutbol@turnitos.com', 'arena123', 'Av. Facundo Quiroga 456, La Rioja', -29.4165, -66.8588,
        'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&h=400&fit=crop', 'light', '#F44336',
        ARRAY['Wifi', 'Vestuarios', 'Cantina'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '15:00', 'close', '23:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '15:00', 'close', '23:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '15:00', 'close', '23:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '15:00', 'close', '23:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '15:00', 'close', '23:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '15:00', 'close', '23:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '15:00', 'close', '23:00')));
    INSERT INTO business_subcategories VALUES ('arena-futbol', v_subcat_futbol_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'arena-futbol', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_2_canchas_id;
    INSERT INTO courts (id, business_id, name, sport, price) VALUES (gen_random_uuid(), 'arena-futbol', 'Cancha 1', 'futbol', 9500), (gen_random_uuid(), 'arena-futbol', 'Cancha 2', 'futbol', 9500);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '5 negocios de Deportes creados';
    RAISE NOTICE '2 Pádel (6 canchas), 3 Fútbol (11 canchas)';
    RAISE NOTICE '17 canchas totales';
    RAISE NOTICE '========================================';
    
END $$;
