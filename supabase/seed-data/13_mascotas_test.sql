-- ============================================
-- PRUEBA: 1 Negocio de Mascotas (Veterinaria)
-- Ejecutar DESPUÉS de 12_mascotas_subcategories.sql
-- ============================================

DO $$
DECLARE
    v_category_mascotas_id UUID;
    v_subcat_veterinarias_id UUID;
    v_plan_duo_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_mascotas_id FROM categories WHERE slug = 'mascotas';
    SELECT id INTO v_subcat_veterinarias_id FROM subcategories WHERE slug = 'veterinarias' AND category_id = v_category_mascotas_id;
    SELECT id INTO v_plan_duo_id FROM subscription_plans WHERE name = 'Dúo' AND business_type = 'service';
    
    -- Crear veterinaria
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('veterinaria-pet-care', 'Veterinaria Pet Care', 'service', v_category_mascotas_id, v_plan_duo_id, 'petcare@turnitos.com', 'vet123', 'Av. San Martín 123, La Rioja', -29.4140, -66.8560,
        'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&h=400&fit=crop',
        'light', '#00BCD4',
        ARRAY['Wifi', 'Aire acondicionado', 'Sala de espera', 'Internación'],
        jsonb_build_object(
            'monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'),
            'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '13:00'),
            'sunday', jsonb_build_object('isOpen', false)
        ),
        ARRAY['Consultas', 'Cirugías', 'Vacunación']
    );
    
    -- Relación con subcategoría
    INSERT INTO business_subcategories VALUES ('veterinaria-pet-care', v_subcat_veterinarias_id);
    
    -- Suscripción
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date)
    SELECT 'veterinaria-pet-care', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days'
    FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    
    -- Especialistas
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES
        ('veterinaria-pet-care', 'Dr. Juan Pérez', 'Veterinario', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop'),
        ('veterinaria-pet-care', 'Dra. María González', 'Veterinaria', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop');
    
    -- Servicios
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES
        ('veterinaria-pet-care', 'Consulta veterinaria', 'Revisión general y diagnóstico', 3000, 30, 'Consultas', 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=800&h=600&fit=crop'),
        ('veterinaria-pet-care', 'Vacunación', 'Aplicación de vacunas obligatorias y opcionales', 2000, 15, 'Vacunación', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop'),
        ('veterinaria-pet-care', 'Castración', 'Cirugía de esterilización', 8000, 120, 'Cirugías', 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&h=600&fit=crop'),
        ('veterinaria-pet-care', 'Desparasitación', 'Tratamiento antiparasitario interno y externo', 1500, 10, 'Consultas', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600&fit=crop'),
        ('veterinaria-pet-care', 'Análisis clínicos', 'Estudios de laboratorio', 4000, 30, 'Consultas', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop');
    
    RAISE NOTICE '✅ Veterinaria Pet Care creada exitosamente';
    
END $$;
