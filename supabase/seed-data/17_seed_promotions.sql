-- ============================================
-- SEED DATA: PROMOCIONES (BANNER HOME)
-- Corregido según esquema inferido de PromotionForm.jsx
-- ============================================

DO $$
DECLARE
    v_business_estetica_id UUID;
    v_business_padel_id UUID;
    v_business_futbol_id UUID;
    v_business_salon_id UUID;
    v_business_veterinaria_id UUID;
    v_business_belleza_id UUID;
BEGIN
    -- Obtener IDs de algunos negocios para asignar promociones
    SELECT id INTO v_business_estetica_id FROM businesses WHERE name = 'Estética Integral' LIMIT 1;
    SELECT id INTO v_business_padel_id FROM businesses WHERE name = 'Padel Club La Rioja' LIMIT 1;
    SELECT id INTO v_business_futbol_id FROM businesses WHERE name = 'Complejo Deportivo El Gol' LIMIT 1;
    SELECT id INTO v_business_salon_id FROM businesses WHERE name = 'Salón Gran Fiesta' LIMIT 1;
    SELECT id INTO v_business_veterinaria_id FROM businesses WHERE name = 'Veterinaria Pet Care' LIMIT 1;
    SELECT id INTO v_business_belleza_id FROM businesses WHERE name = 'Salón Glamour' LIMIT 1;

    -- Borrar promociones existentes para evitar duplicados
    DELETE FROM promotions;

    -- 1. Promoción Estética
    IF v_business_estetica_id IS NOT NULL THEN
        INSERT INTO promotions (business_id, title, description, image, discount)
        VALUES (
            v_business_estetica_id,
            'Tratamientos Faciales de Verano',
            'Renueva tu piel con nuestra limpieza profunda premium.',
            'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&h=400&fit=crop',
            '20% OFF'
        );
    END IF;

    -- 2. Promoción Pádel
    IF v_business_padel_id IS NOT NULL THEN
        INSERT INTO promotions (business_id, title, description, image, discount)
        VALUES (
            v_business_padel_id,
            'Torneo de Pádel',
            'Inscríbete en el torneo de fin de semana. Cupos limitados.',
            'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=1200&h=400&fit=crop',
            'Inscripción Gratis'
        );
    END IF;

    -- 3. Promoción Fútbol
    IF v_business_futbol_id IS NOT NULL THEN
        INSERT INTO promotions (business_id, title, description, image, discount)
        VALUES (
            v_business_futbol_id,
            'Promo Mañanas',
            'Juga de 9 a 12hs con descuento especial en canchas techadas.',
            'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1200&h=400&fit=crop',
            '3x2 Horas'
        );
    END IF;

    -- 4. Promoción Salón Eventos
    IF v_business_salon_id IS NOT NULL THEN
        INSERT INTO promotions (business_id, title, description, image, discount)
        VALUES (
            v_business_salon_id,
            'Reserva Anticipada 2026',
            'Congela el precio de tu fiesta reservando con 6 meses de anticipación.',
            'https://images.unsplash.com/photo-1519167758481-83f29da8c8b0?w=1200&h=400&fit=crop',
            '50% Seña'
        );
    END IF;
    
    -- 5. Promoción Veterinaria
    IF v_business_veterinaria_id IS NOT NULL THEN
        INSERT INTO promotions (business_id, title, description, image, discount)
        VALUES (
            v_business_veterinaria_id,
            'Campaña de Vacunación',
            'Protege a tu mascota. Vacunación antirrábica sin cargo.',
            'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&h=400&fit=crop',
            'Gratis'
        );
    END IF;

    -- 6. Promo Belleza
     IF v_business_belleza_id IS NOT NULL THEN
        INSERT INTO promotions (business_id, title, description, image, discount)
        VALUES (
            v_business_belleza_id,
            'Día de Spa Capilar',
            'Tratamiento de nutrición intensa + Corte.',
            'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&h=400&fit=crop',
            '15% OFF'
        );
    END IF;

    RAISE NOTICE '✅ 6 Promociones cargadas exitosamente';

END $$;
