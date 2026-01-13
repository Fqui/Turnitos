-- ============================================
-- SEED DATA: Categoría ALQUILERES - COMPLETO
-- 3 negocios (2 Salones, 1 Quincho)
-- ============================================

DO $$
DECLARE
    v_category_alquileres_id UUID;
    v_subcat_salones_id UUID;
    v_subcat_quinchos_id UUID;
    v_plan_1_espacio_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_alquileres_id FROM categories WHERE slug = 'alquileres';
    SELECT id INTO v_subcat_salones_id FROM subcategories WHERE slug = 'salones-eventos' AND category_id = v_category_alquileres_id;
    SELECT id INTO v_subcat_quinchos_id FROM subcategories WHERE slug = 'quinchos' AND category_id = v_category_alquileres_id;
    SELECT id INTO v_plan_1_espacio_id FROM subscription_plans WHERE name = '1 Espacio' AND business_type = 'alquiler';
    
    -- ============================================
    -- 1. SALÓN GRAN FIESTA
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('salon-gran-fiesta', 'Salón Gran Fiesta', 'alquiler', v_category_alquileres_id, v_plan_1_espacio_id, 'granfiesta@turnitos.com', 'fiesta123', 'Av. Circunvalación 1234, La Rioja', -29.4160, -66.8580,
        'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1519167758481-83f29da8c8b0?w=1200&h=400&fit=crop',
        'light', '#E91E63',
        ARRAY['Wifi', 'Aire acondicionado', 'Estacionamiento', 'Cocina equipada', 'Sonido profesional', 'Iluminación LED', 'Pista de baile'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '23:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '23:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '23:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '23:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '23:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '23:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '23:00')));
    INSERT INTO business_subcategories VALUES ('salon-gran-fiesta', v_subcat_salones_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'salon-gran-fiesta', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_1_espacio_id;
    
    -- ============================================
    -- 2. SALÓN IMPERIAL
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('salon-imperial', 'Salón Imperial', 'alquiler', v_category_alquileres_id, v_plan_1_espacio_id, 'imperial@turnitos.com', 'imperial123', 'Calle Belgrano 456, La Rioja', -29.4135, -66.8555,
        'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=400&fit=crop',
        'light', '#673AB7',
        ARRAY['Wifi', 'Aire acondicionado', 'Estacionamiento privado', 'Cocina industrial', 'Sonido', 'Proyector', 'Decoración incluida'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', false), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '00:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '00:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '00:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '00:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '00:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '00:00')));
    INSERT INTO business_subcategories VALUES ('salon-imperial', v_subcat_salones_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'salon-imperial', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_1_espacio_id;
    
    -- ============================================
    -- 3. QUINCHO LOS AROMOS
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('quincho-los-aromos', 'Quincho Los Aromos', 'alquiler', v_category_alquileres_id, v_plan_1_espacio_id, 'losaromos@turnitos.com', 'quincho123', 'Barrio Jardín del Norte, La Rioja', -29.4170, -66.8590,
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=400&fit=crop',
        'light', '#4CAF50',
        ARRAY['Wifi', 'Estacionamiento', 'Parrilla', 'Pileta', 'Quincho cubierto', 'Parque', 'Juegos infantiles'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00'), 'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '22:00')));
    INSERT INTO business_subcategories VALUES ('quincho-los-aromos', v_subcat_quinchos_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'quincho-los-aromos', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_1_espacio_id;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '3 negocios de Alquileres creados';
    RAISE NOTICE '2 Salones de eventos, 1 Quincho';
    RAISE NOTICE '========================================';
    
END $$;
