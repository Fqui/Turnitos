-- ============================================
-- PRUEBA: 1 Negocio de Alquileres (Salón)
-- Ejecutar DESPUÉS de 09_alquileres_subcategories.sql
-- ============================================

DO $$
DECLARE
    v_category_alquileres_id UUID;
    v_subcat_salones_id UUID;
    v_plan_1_espacio_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_alquileres_id FROM categories WHERE slug = 'alquileres';
    SELECT id INTO v_subcat_salones_id FROM subcategories WHERE slug = 'salones-eventos' AND category_id = v_category_alquileres_id;
    SELECT id INTO v_plan_1_espacio_id FROM subscription_plans WHERE name = '1 Espacio' AND business_type = 'alquiler';
    
    -- Crear salón de eventos
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours)
    VALUES ('salon-eventos-elegance', 'Salón de Eventos Elegance', 'alquiler', v_category_alquileres_id, v_plan_1_espacio_id, 'elegance@turnitos.com', 'salon123', 'Av. San Francisco 890, La Rioja', -29.4145, -66.8565,
        'https://images.unsplash.com/photo-1519167758481-83f29da8c8b0?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=400&fit=crop',
        'light', '#FF6F00',
        ARRAY['Wifi', 'Aire acondicionado', 'Estacionamiento', 'Cocina equipada', 'Sonido', 'Iluminación'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '23:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '23:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '23:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '23:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '23:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '23:00'),
            'sunday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '23:00')
        )
    );
    
    -- Relación con subcategoría
    INSERT INTO business_subcategories VALUES ('salon-eventos-elegance', v_subcat_salones_id);
    
    -- Suscripción
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date)
    SELECT 'salon-eventos-elegance', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days'
    FROM subscription_plans sp WHERE sp.id = v_plan_1_espacio_id;
    
    RAISE NOTICE '✅ Salón de Eventos Elegance creado exitosamente';
    
END $$;
