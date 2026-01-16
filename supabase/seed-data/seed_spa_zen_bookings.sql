-- Script para sembrar reservas en Spa Zen
-- Genera reservas de prueba realistas sin email

DO $$
DECLARE
    v_business_id TEXT := 'spa-zen'; -- ID confirmado
    v_specialist_ids TEXT[]; -- Cambiado a TEXT[] para coincidir con la tabla bookings
    v_specialist_id TEXT;    -- Cambiado a TEXT
    v_booking_date DATE;
    v_hour INTEGER;
    v_time TEXT;
    v_customer_names TEXT[] := ARRAY[
        'Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana Martínez',
        'Luis Fernández', 'Laura Sánchez', 'Diego López', 'Sofía García',
        'Martín Torres', 'Valentina Ruiz', 'Lucas Silva', 'Camila Díaz',
        'Fernando Castro', 'Gabriela Morales', 'Pablo Herrera', 'Lucía Romero'
    ];
    v_customer_phones TEXT[] := ARRAY[
        '3804123456', '3804234567', '3804345678', '3804456789',
        '3804567890', '3804678901', '3804789012', '3804890123',
        '3804901234', '3804012345', '3804112345', '3804212345',
        '3804312345', '3804412345', '3804512345', '3804612345'
    ];
    v_random_idx INTEGER;
    v_random_status TEXT;
    v_days_offset INTEGER;
    v_total_created INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Iniciando creación de reservas para: Spa Zen (ID: %)', v_business_id;

    -- Obtener los IDs de especialistas de la tabla specialists
    -- Hacemos CAST a TEXT para asegurar compatibilidad con la tabla bookings
    SELECT ARRAY_AGG(id::TEXT)
    INTO v_specialist_ids
    FROM specialists
    WHERE business_id = v_business_id;

    IF v_specialist_ids IS NULL OR array_length(v_specialist_ids, 1) = 0 THEN
        RAISE EXCEPTION '❌ No se encontraron especialistas para Spa Zen. Verifica que existan en la tabla ''specialists'' con business_id = ''spa-zen''.';
    END IF;

    RAISE NOTICE '✅ Encontrados % especialistas (IDs): %', array_length(v_specialist_ids, 1), v_specialist_ids;
    RAISE NOTICE '';

    -- Generar reservas: 7 días atrás hasta 30 días adelante
    FOR v_days_offset IN -7..30 LOOP
        v_booking_date := CURRENT_DATE + (v_days_offset || ' days')::INTERVAL;
        
        -- Saltar domingos (spa cerrado)
        IF EXTRACT(DOW FROM v_booking_date) = 0 THEN
            CONTINUE;
        END IF;

        -- Generar 4-10 reservas por día
        FOR i IN 1..(4 + floor(random() * 7)::INTEGER) LOOP
            -- Seleccionar especialista aleatorio
            v_random_idx := 1 + floor(random() * array_length(v_specialist_ids, 1))::INTEGER;
            v_specialist_id := v_specialist_ids[v_random_idx];

            -- Generar hora aleatoria entre 10:00 y 19:00
            v_hour := 10 + floor(random() * 10)::INTEGER;
            v_time := (v_hour || ':00');

            -- Seleccionar cliente aleatorio
            v_random_idx := 1 + floor(random() * array_length(v_customer_names, 1))::INTEGER;

            -- Estado: 70% confirmadas, 15% pendientes, 10% completadas/atendidas, 5% canceladas
            v_random_status := CASE 
                WHEN random() < 0.70 THEN 'confirmed'
                WHEN random() < 0.85 THEN 'pending'
                WHEN random() < 0.95 THEN 
                    CASE WHEN random() < 0.5 THEN 'completed' ELSE 'attended' END
                ELSE 'cancelled'
            END;

            -- Insertar reserva
            BEGIN
                INSERT INTO bookings (
                    business_id,
                    specialist_id,
                    resource_id,
                    customer_name,
                    customer_phone,
                    date,
                    time,
                    duration,
                    status,
                    price,
                    notes,
                    created_at
                ) VALUES (
                    v_business_id,
                    v_specialist_id,
                    v_specialist_id, -- Usamos especialista también como resource_id
                    v_customer_names[v_random_idx],
                    v_customer_phones[v_random_idx],
                    v_booking_date,
                    v_time,
                    60, -- 60 minutos de duración
                    v_random_status,
                    8000 + floor(random() * 12000)::INTEGER, -- Price
                    CASE 
                        WHEN random() < 0.2 THEN 'Primera vez en el spa'
                        WHEN random() < 0.4 THEN 'Cliente frecuente'
                        ELSE NULL
                    END,
                    NOW() - (floor(random() * 30)::INTEGER || ' days')::INTERVAL
                );
                
                v_total_created := v_total_created + 1;
                
            EXCEPTION
                WHEN unique_violation THEN
                    -- Ignorar si ya existe reserva en ese horario
                    CONTINUE;
                WHEN OTHERS THEN
                    RAISE NOTICE '⚠️  Error al insertar: %', SQLERRM;
            END;
        END LOOP;
    END LOOP;

    -- Mostrar resumen
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ RESERVAS CREADAS: %', v_total_created;
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '';
    
    -- Estadísticas por estado
    FOR v_random_status IN SELECT DISTINCT status FROM bookings WHERE business_id = v_business_id LOOP
        SELECT COUNT(*) INTO v_random_idx
        FROM bookings
        WHERE business_id = v_business_id AND status = v_random_status;
        
        RAISE NOTICE '   📊 %: % reservas', 
            CASE v_random_status
                WHEN 'confirmed' THEN 'CONFIRMADAS'
                WHEN 'pending' THEN 'PENDIENTES'
                WHEN 'cancelled' THEN 'CANCELADAS'
            END,
            v_random_idx;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '   📅 Desde: %', (SELECT MIN(date) FROM bookings WHERE business_id = v_business_id);
    RAISE NOTICE '   📅 Hasta: %', (SELECT MAX(date) FROM bookings WHERE business_id = v_business_id);
    RAISE NOTICE '';
    RAISE NOTICE '   💰 Ingresos totales (confirmadas): $%', 
        (SELECT SUM(price) FROM bookings WHERE business_id = v_business_id AND status = 'confirmed');
    RAISE NOTICE '';

END $$;
