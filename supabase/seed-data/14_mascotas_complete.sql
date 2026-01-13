-- ============================================
-- SEED DATA: Categoría MASCOTAS - COMPLETO
-- 3 negocios (2 Veterinarias, 1 Peluquería Canina)
-- ============================================

DO $$
DECLARE
    v_category_mascotas_id UUID;
    v_subcat_veterinarias_id UUID;
    v_subcat_peluqueria_id UUID;
    v_plan_duo_id UUID;
    v_plan_trio_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_mascotas_id FROM categories WHERE slug = 'mascotas';
    SELECT id INTO v_subcat_veterinarias_id FROM subcategories WHERE slug = 'veterinarias' AND category_id = v_category_mascotas_id;
    SELECT id INTO v_subcat_peluqueria_id FROM subcategories WHERE slug = 'peluqueria-canina' AND category_id = v_category_mascotas_id;
    SELECT id INTO v_plan_duo_id FROM subscription_plans WHERE name = 'Dúo' AND business_type = 'service';
    SELECT id INTO v_plan_trio_id FROM subscription_plans WHERE name = 'Trío' AND business_type = 'service';
    
    -- ============================================
    -- 1. VETERINARIA ANIMAL HEALTH
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('veterinaria-animal-health', 'Veterinaria Animal Health', 'service', v_category_mascotas_id, v_plan_trio_id, 'animalhealth@turnitos.com', 'animal123', 'Av. Libertador 456, La Rioja', -29.4150, -66.8570,
        'https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1200&h=400&fit=crop',
        'light', '#009688',
        ARRAY['Wifi', 'Aire acondicionado', 'Sala de espera', 'Internación', 'Quirófano', 'Laboratorio'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '20:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '20:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '20:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '20:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '20:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '14:00'), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Consultas', 'Cirugías', 'Vacunación', 'Diagnóstico']);
    INSERT INTO business_subcategories VALUES ('veterinaria-animal-health', v_subcat_veterinarias_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'veterinaria-animal-health', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('veterinaria-animal-health', 'Dr. Roberto Sánchez', 'Veterinario Cirujano', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop'), ('veterinaria-animal-health', 'Dra. Laura Fernández', 'Veterinaria', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'), ('veterinaria-animal-health', 'Dr. Martín López', 'Veterinario', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('veterinaria-animal-health', 'Consulta general', 'Revisión completa y diagnóstico', 3500, 30, 'Consultas', 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=800&h=600&fit=crop'), ('veterinaria-animal-health', 'Vacunación completa', 'Plan de vacunación anual', 2500, 20, 'Vacunación', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop'), ('veterinaria-animal-health', 'Cirugía general', 'Intervenciones quirúrgicas', 10000, 180, 'Cirugías', 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&h=600&fit=crop'), ('veterinaria-animal-health', 'Ecografía', 'Diagnóstico por imágenes', 5000, 30, 'Diagnóstico', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop'), ('veterinaria-animal-health', 'Radiografía', 'Estudios radiológicos', 4500, 20, 'Diagnóstico', 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&h=600&fit=crop'), ('veterinaria-animal-health', 'Limpieza dental', 'Profilaxis y limpieza bucal', 6000, 60, 'Consultas', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600&fit=crop');
    
    -- ============================================
    -- 2. CLÍNICA VETERINARIA MASCOTAS FELICES
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('veterinaria-mascotas-felices', 'Clínica Veterinaria Mascotas Felices', 'service', v_category_mascotas_id, v_plan_duo_id, 'mascotasfelices@turnitos.com', 'felices123', 'Calle Rivadavia 789, La Rioja', -29.4125, -66.8545,
        'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&h=400&fit=crop',
        'light', '#FF9800',
        ARRAY['Wifi', 'Aire acondicionado', 'Estacionamiento'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '17:00', 'close2', '21:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '17:00', 'close2', '21:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '17:00', 'close2', '21:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '17:00', 'close2', '21:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '17:00', 'close2', '21:00'), 'saturday', jsonb_build_object('isOpen', false), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Consultas', 'Vacunación']);
    INSERT INTO business_subcategories VALUES ('veterinaria-mascotas-felices', v_subcat_veterinarias_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'veterinaria-mascotas-felices', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('veterinaria-mascotas-felices', 'Dra. Claudia Morales', 'Veterinaria', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop'), ('veterinaria-mascotas-felices', 'Dr. Pablo Castro', 'Veterinario', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('veterinaria-mascotas-felices', 'Consulta veterinaria', 'Atención general y diagnóstico', 2800, 30, 'Consultas', 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=800&h=600&fit=crop'), ('veterinaria-mascotas-felices', 'Vacunas', 'Aplicación de vacunas', 1800, 15, 'Vacunación', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop'), ('veterinaria-mascotas-felices', 'Desparasitación', 'Tratamiento antiparasitario', 1200, 10, 'Consultas', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600&fit=crop'), ('veterinaria-mascotas-felices', 'Control de salud', 'Chequeo preventivo', 2500, 20, 'Consultas', 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop');
    
    -- ============================================
    -- 3. PELUQUERÍA CANINA GLAMOUR PETS
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('peluqueria-glamour-pets', 'Peluquería Canina Glamour Pets', 'service', v_category_mascotas_id, v_plan_duo_id, 'glamourpets@turnitos.com', 'glamour123', 'Av. San Nicolás 234, La Rioja', -29.4165, -66.8585,
        'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1616606103915-dea7be788566?w=1200&h=400&fit=crop',
        'light', '#E91E63',
        ARRAY['Wifi', 'Aire acondicionado', 'Productos premium'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', false), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Baño y Corte', 'Estética Canina']);
    INSERT INTO business_subcategories VALUES ('peluqueria-glamour-pets', v_subcat_peluqueria_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'peluqueria-glamour-pets', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('peluqueria-glamour-pets', 'Yamila Ríos', 'Peluquera Canina', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'), ('peluqueria-glamour-pets', 'Florencia Paz', 'Groomer Profesional', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('peluqueria-glamour-pets', 'Baño completo', 'Baño con shampoo premium y secado', 2500, 45, 'Baño y Corte', 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&h=600&fit=crop'), ('peluqueria-glamour-pets', 'Corte de pelo', 'Corte según raza y preferencia', 3000, 60, 'Baño y Corte', 'https://images.unsplash.com/photo-1616606103915-dea7be788566?w=1200&h=400&fit=crop'), ('peluqueria-glamour-pets', 'Baño y corte completo', 'Servicio integral de estética', 4500, 90, 'Baño y Corte', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600&fit=crop'), ('peluqueria-glamour-pets', 'Corte de uñas', 'Limado y corte de uñas', 800, 15, 'Estética Canina', 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=800&h=600&fit=crop'), ('peluqueria-glamour-pets', 'Limpieza de oídos', 'Higiene auricular', 600, 10, 'Estética Canina', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600&fit=crop'), ('peluqueria-glamour-pets', 'Deslanado', 'Eliminación de pelo muerto', 2000, 30, 'Estética Canina', 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '3 negocios de Mascotas creados';
    RAISE NOTICE '2 Veterinarias, 1 Peluquería Canina';
    RAISE NOTICE '7 especialistas, 16 servicios';
    RAISE NOTICE '========================================';
    
END $$;
