-- ============================================
-- SEED DATA: Categoría SALUD - COMPLETO
-- 6 negocios con servicios y especialistas
-- 2 Kinesiología, 2 Nutrición, 2 Psicología
-- ============================================

DO $$
DECLARE
    v_category_salud_id UUID;
    v_subcat_kinesio_id UUID;
    v_subcat_nutricion_id UUID;
    v_subcat_psicologia_id UUID;
    v_plan_duo_id UUID;
    v_plan_trio_id UUID;
    
BEGIN
    -- Obtener IDs
    SELECT id INTO v_category_salud_id FROM categories WHERE slug = 'salud';
    SELECT id INTO v_subcat_kinesio_id FROM subcategories WHERE slug = 'kinesiologia' AND category_id = v_category_salud_id;
    SELECT id INTO v_subcat_nutricion_id FROM subcategories WHERE slug = 'nutricion' AND category_id = v_category_salud_id;
    SELECT id INTO v_subcat_psicologia_id FROM subcategories WHERE slug = 'psicologia' AND category_id = v_category_salud_id;
    SELECT id INTO v_plan_duo_id FROM subscription_plans WHERE name = 'Dúo' AND business_type = 'service';
    SELECT id INTO v_plan_trio_id FROM subscription_plans WHERE name = 'Trío' AND business_type = 'service';
    
    -- ============================================
    -- 1. CENTRO KINESIOLÓGICO MOVIMIENTO
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('centro-kinesio-movimiento', 'Centro Kinesiológico Movimiento', 'service', v_category_salud_id, v_plan_trio_id, 'kinesiomovimiento@turnitos.com', 'kinesio123', 'Av. Presidente Perón 567, La Rioja', -29.4155, -66.8575,
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=400&fit=crop', 'light', '#2196F3',
        ARRAY['Wifi', 'Aire acondicionado', 'Sala de espera'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '08:00', 'close', '12:00', 'open2', '15:00', 'close2', '19:00'), 'saturday', jsonb_build_object('isOpen', false), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Rehabilitación', 'Kinesiología Deportiva', 'Tratamientos']);
    INSERT INTO business_subcategories VALUES ('centro-kinesio-movimiento', v_subcat_kinesio_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'centro-kinesio-movimiento', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('centro-kinesio-movimiento', 'Lic. Carlos Méndez', 'Kinesiólogo', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop'), ('centro-kinesio-movimiento', 'Lic. María Sánchez', 'Kinesióloga Deportiva', 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop'), ('centro-kinesio-movimiento', 'Dr. Jorge Ramírez', 'Fisioterapeuta', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('centro-kinesio-movimiento', 'Rehabilitación traumatológica', 'Tratamiento post-operatorio y recuperación de lesiones', 4000, 60, 'Rehabilitación', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop'), ('centro-kinesio-movimiento', 'Kinesiología deportiva', 'Prevención y tratamiento de lesiones deportivas', 4500, 60, 'Kinesiología Deportiva', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'), ('centro-kinesio-movimiento', 'RPG', 'Reeducación Postural Global', 5000, 60, 'Tratamientos', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop'), ('centro-kinesio-movimiento', 'Drenaje linfático', 'Masaje terapéutico para circulación', 3500, 45, 'Tratamientos', 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=600&fit=crop'), ('centro-kinesio-movimiento', 'Electroterapia', 'Tratamiento con corrientes eléctricas', 3000, 30, 'Tratamientos', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=600&fit=crop');
    
    -- ============================================
    -- 2. KINESIO SALUD
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('kinesio-salud', 'Kinesio Salud', 'service', v_category_salud_id, v_plan_duo_id, 'kinesiosalud@turnitos.com', 'salud123', 'Calle Rivadavia 234, La Rioja', -29.4125, -66.8545,
        'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=400&fit=crop', 'light', '#03A9F4',
        ARRAY['Wifi', 'Aire acondicionado'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '09:00', 'close', '18:00'), 'saturday', jsonb_build_object('isOpen', false), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Fisioterapia', 'Rehabilitación']);
    INSERT INTO business_subcategories VALUES ('kinesio-salud', v_subcat_kinesio_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'kinesio-salud', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('kinesio-salud', 'Lic. Andrea López', 'Kinesióloga', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'), ('kinesio-salud', 'Lic. Pablo Fernández', 'Kinesiólogo', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('kinesio-salud', 'Fisioterapia', 'Tratamiento manual y ejercicios terapéuticos', 3500, 60, 'Fisioterapia', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop'), ('kinesio-salud', 'Masoterapia', 'Masajes terapéuticos descontracturantes', 3000, 45, 'Fisioterapia', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop'), ('kinesio-salud', 'Rehabilitación post-quirúrgica', 'Recuperación después de cirugías', 4000, 60, 'Rehabilitación', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop'), ('kinesio-salud', 'Kinesio tape', 'Vendaje neuromuscular', 2000, 20, 'Fisioterapia', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop');
    
    -- ============================================
    -- 3. NUTRICIÓN INTEGRAL
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('nutricion-integral', 'Nutrición Integral', 'service', v_category_salud_id, v_plan_duo_id, 'nutricionintegral@turnitos.com', 'nutricion123', 'Av. Facundo Quiroga 789, La Rioja', -29.4165, -66.8585,
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=400&fit=crop', 'light', '#4CAF50',
        ARRAY['Wifi', 'Aire acondicionado'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '16:00', 'close2', '20:00'), 'saturday', jsonb_build_object('isOpen', false), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Consultas', 'Planes Alimentarios']);
    INSERT INTO business_subcategories VALUES ('nutricion-integral', v_subcat_nutricion_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'nutricion-integral', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('nutricion-integral', 'Lic. Gabriela Torres', 'Nutricionista', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop'), ('nutricion-integral', 'Lic. Martín Suárez', 'Nutricionista Deportivo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('nutricion-integral', 'Consulta nutricional', 'Evaluación y asesoramiento personalizado', 3000, 60, 'Consultas', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop'), ('nutricion-integral', 'Plan alimentario personalizado', 'Diseño de plan según objetivos', 3500, 60, 'Planes Alimentarios', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=400&fit=crop'), ('nutricion-integral', 'Nutrición deportiva', 'Planes para rendimiento deportivo', 4000, 60, 'Planes Alimentarios', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'), ('nutricion-integral', 'Control de peso', 'Seguimiento y ajuste de plan', 2500, 30, 'Consultas', 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&h=600&fit=crop');
    
    -- ============================================
    -- 4. CENTRO DE NUTRICIÓN VIDA SANA
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('nutricion-vida-sana', 'Centro de Nutrición Vida Sana', 'service', v_category_salud_id, v_plan_trio_id, 'vidasana@turnitos.com', 'vida123', 'Calle San Nicolás de Bari 345, La Rioja', -29.4140, -66.8560,
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=400&fit=crop', 'light', '#8BC34A',
        ARRAY['Wifi', 'Sala de espera'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', false), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '14:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '14:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '14:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '14:00'), 'saturday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '08:00', 'close', '14:00'), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Consultas', 'Nutrición Clínica']);
    INSERT INTO business_subcategories VALUES ('nutricion-vida-sana', v_subcat_nutricion_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'nutricion-vida-sana', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('nutricion-vida-sana', 'Lic. Laura Benítez', 'Nutricionista', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'), ('nutricion-vida-sana', 'Lic. Sofía Morales', 'Nutricionista Infantil', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400&h=400&fit=crop'), ('nutricion-vida-sana', 'Lic. Diego Castro', 'Nutricionista', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('nutricion-vida-sana', 'Asesoramiento nutricional', 'Primera consulta y evaluación completa', 3200, 60, 'Consultas', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop'), ('nutricion-vida-sana', 'Dietas terapéuticas', 'Planes para patologías específicas', 3800, 60, 'Nutrición Clínica', 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&h=600&fit=crop'), ('nutricion-vida-sana', 'Nutrición infantil', 'Planes para niños y adolescentes', 3500, 45, 'Nutrición Clínica', 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=600&fit=crop'), ('nutricion-vida-sana', 'Educación alimentaria', 'Talleres y charlas grupales', 2000, 90, 'Consultas', 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=600&fit=crop');
    
    -- ============================================
    -- 5. CONSULTORIO PSICOLÓGICO MENTE SANA
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('psico-mente-sana', 'Consultorio Psicológico Mente Sana', 'service', v_category_salud_id, v_plan_duo_id, 'mentesana@turnitos.com', 'psico123', 'Av. Ortiz de Ocampo 678, La Rioja', -29.4150, -66.8570,
        'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&h=400&fit=crop', 'light', '#9C27B0',
        ARRAY['Wifi', 'Aire acondicionado', 'Sala de espera privada'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '15:00', 'close2', '19:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '15:00', 'close2', '19:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '15:00', 'close2', '19:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '15:00', 'close2', '19:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', true, 'open', '09:00', 'close', '13:00', 'open2', '15:00', 'close2', '19:00'), 'saturday', jsonb_build_object('isOpen', false), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Terapia Individual', 'Terapia Familiar']);
    INSERT INTO business_subcategories VALUES ('psico-mente-sana', v_subcat_psicologia_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'psico-mente-sana', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_duo_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('psico-mente-sana', 'Lic. Claudia Vega', 'Psicóloga', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'), ('psico-mente-sana', 'Lic. Roberto Paz', 'Psicólogo', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('psico-mente-sana', 'Terapia individual', 'Sesiones personalizadas', 4000, 60, 'Terapia Individual', 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800&h=600&fit=crop'), ('psico-mente-sana', 'Terapia de pareja', 'Orientación y resolución de conflictos', 5000, 60, 'Terapia Familiar', 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&h=600&fit=crop'), ('psico-mente-sana', 'Terapia familiar', 'Trabajo con dinámicas familiares', 5500, 90, 'Terapia Familiar', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop'), ('psico-mente-sana', 'Orientación vocacional', 'Evaluación y guía profesional', 3500, 60, 'Terapia Individual', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop');
    
    -- ============================================
    -- 6. CENTRO PSICOLÓGICO BIENESTAR
    -- ============================================
    INSERT INTO businesses (id, name, type, category_id, subscription_plan_id, email, password, location, latitude, longitude, logo, banner_image, theme, primary_color, amenities, hours, service_categories)
    VALUES ('psico-bienestar', 'Centro Psicológico Bienestar', 'service', v_category_salud_id, v_plan_trio_id, 'psicobienestar@turnitos.com', 'bienestar123', 'Calle Catamarca 123, La Rioja', -29.4130, -66.8550,
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=400&fit=crop', 'light', '#673AB7',
        ARRAY['Wifi', 'Aire acondicionado'],
        jsonb_build_object('monday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '20:00'), 'tuesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '20:00'), 'wednesday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '20:00'), 'thursday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '20:00'), 'friday', jsonb_build_object('isOpen', true, 'isSplit', false, 'open', '10:00', 'close', '20:00'), 'saturday', jsonb_build_object('isOpen', false), 'sunday', jsonb_build_object('isOpen', false)),
        ARRAY['Psicoterapia', 'Terapia Infantil']);
    INSERT INTO business_subcategories VALUES ('psico-bienestar', v_subcat_psicologia_id);
    INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, billing_end, next_billing_date) SELECT 'psico-bienestar', sp.name, sp.spaces_included, sp.price_monthly, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days' FROM subscription_plans sp WHERE sp.id = v_plan_trio_id;
    INSERT INTO specialists (business_id, name, role, avatar_url) VALUES ('psico-bienestar', 'Lic. Patricia Herrera', 'Psicóloga Cognitivo-Conductual', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop'), ('psico-bienestar', 'Lic. Marcela Díaz', 'Psicóloga Infantil', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'), ('psico-bienestar', 'Lic. Fernando Ruiz', 'Psicólogo', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop');
    INSERT INTO services (business_id, name, description, price, duration, category, image_url) VALUES ('psico-bienestar', 'Psicoterapia cognitivo-conductual', 'Tratamiento basado en evidencia', 4200, 60, 'Psicoterapia', 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800&h=600&fit=crop'), ('psico-bienestar', 'Terapia para niños', 'Atención psicológica infantil', 3800, 45, 'Terapia Infantil', 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=600&fit=crop'), ('psico-bienestar', 'Terapia para adolescentes', 'Orientación en etapa adolescente', 4000, 60, 'Terapia Infantil', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop'), ('psico-bienestar', 'Manejo de ansiedad', 'Técnicas y estrategias de afrontamiento', 4500, 60, 'Psicoterapia', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '6 negocios de Salud creados';
    RAISE NOTICE '2 Kinesiología, 2 Nutrición, 2 Psicología';
    RAISE NOTICE '14 especialistas, 27 servicios';
    RAISE NOTICE '========================================';
    
END $$;
