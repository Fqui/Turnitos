-- ============================================
-- PRUEBA: 1 Negocio de Salud (Kinesiología)
-- Ejecutar DESPUÉS de 06_salud_subcategories.sql
-- ============================================

DO $$
DECLARE
    v_category_salud_id UUID;
    v_subcat_kinesio_id UUID;
    v_plan_trio_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_salud_id FROM categories WHERE slug = 'salud';
    SELECT id INTO v_subcat_kinesio_id FROM subcategories WHERE slug = 'kinesiologia' AND category_id = v_category_salud_id;
    SELECT id INTO v_plan_trio_id FROM subscription_plans WHERE name = 'Trío' AND business_type = 'service';
    
    -- Crear negocio de Kinesiología
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('centro-kinesio-movimiento', 'Centro Kinesiológico Movimiento', 'service', v_category_salud_id, v_plan_trio_id, 'kinesiomovimiento@turnitos.com', 'kinesio123', 'Av. Presidente Perón 567, La Rioja', -29.4155, -66.8575,
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=400&fit=crop',
        'light', '#2196F3',
        ARRAY['Wifi', 'Aire acondicionado', 'Sala de espera'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'),
            'saturday', jsonb_build_object('isOpen', false),
            'sunday', jsonb_build_object('isOpen', false)
        ),
        ARRAY['Rehabilitación', 'Kinesiología Deportiva', 'Tratamientos']
    );
    
    -- Relación con subcategoría
    INSERT INTO business_subcategories VALUES ('centro-kinesio-movimiento', v_subcat_kinesio_id);
    
    -- Suscripción
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date)
    SELECT 'centro-kinesio-movimiento', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days'
    FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES
        ('centro-kinesio-movimiento', 'Lic. Carlos Méndez', 'Kinesiólogo', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop'),
        ('centro-kinesio-movimiento', 'Lic. María Sánchez', 'Kinesióloga Deportiva', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop'),
        ('centro-kinesio-movimiento', 'Dr. Jorge Ramírez', 'Fisioterapeuta', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES
        ('centro-kinesio-movimiento', 'Rehabilitación traumatológica', 'Tratamiento post-operatorio y recuperación de lesiones', 4000, 60, 'Rehabilitación', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop'),
        ('centro-kinesio-movimiento', 'Kinesiología deportiva', 'Prevención y tratamiento de lesiones deportivas', 4500, 60, 'Kinesiología Deportiva', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'),
        ('centro-kinesio-movimiento', 'RPG', 'Reeducación Postural Global', 5000, 60, 'Tratamientos', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop'),
        ('centro-kinesio-movimiento', 'Drenaje linfático', 'Masaje terapéutico para circulación', 3500, 45, 'Tratamientos', 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=600&fit=crop'),
        ('centro-kinesio-movimiento', 'Electroterapia', 'Tratamiento con corrientes eléctricas', 3000, 30, 'Tratamientos', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=600&fit=crop');
    
    RAISE NOTICE '✅ Centro Kinesiológico Movimiento creado exitosamente';
    
END $$;
