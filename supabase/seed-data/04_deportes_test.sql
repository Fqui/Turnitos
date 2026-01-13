-- ============================================
-- PRUEBA: 1 Negocio de Deportes (Pádel)
-- Ejecutar DESPUÉS de 03_deportes_subcategories.sql
-- ============================================

DO $$
DECLARE
    v_category_deportes_id UUID;
    v_subcat_padel_id UUID;
    v_plan_adicional_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_deportes_id FROM categories WHERE slug = 'deportes';
    SELECT id INTO v_subcat_padel_id FROM subcategories WHERE slug = 'padel' AND category_id = v_category_deportes_id;
    SELECT id INTO v_plan_adicional_id FROM subscription_plans WHERE name = 'Por Cancha Adicional' AND business_type = 'sport';
    
    -- Crear negocio de Pádel
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('padel-club-la-rioja', 'Padel Club La Rioja', 'sport', v_category_deportes_id, v_plan_adicional_id, 'padelclub@turnitos.com', 'padel123', 'Av. Rivadavia 1234, La Rioja', -29.4135, -66.8558,
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop', 
        'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=1200&h=400&fit=crop', 
        'light', '#00E676',
        ARRAY['Wifi', 'Estacionamiento', 'Vestuarios', 'Cantina'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 
            'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '21:00'), 
            'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '21:00')
        )
    );
    
    -- Relación con subcategoría
    INSERT INTO business_subcategories VALUES ('padel-club-la-rioja', v_subcat_padel_id);
    
    -- Suscripción
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) 
    SELECT 'padel-club-la-rioja', sp.name, 4, sp.price_monthly * 4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' 
    FROM subscription_plans sp WHERE sp.id = v_plan_adicional_id;
    
    -- Canchas
    INSERT INTO courts (id, business_id, name, sport, price) VALUES 
        (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 1', 'padel', 8000),
        (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 2', 'padel', 8000),
        (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 3', 'padel', 8000),
        (gen_random_uuid(), 'padel-club-la-rioja', 'Cancha 4', 'padel', 9000);
    
    RAISE NOTICE '✅ Padel Club La Rioja creado exitosamente con 4 canchas';
    
END $$;
