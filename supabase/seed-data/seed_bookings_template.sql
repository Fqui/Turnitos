-- Script para sembrar reservas de prueba en un negocio específico
-- Instrucciones: 
-- 1. Reemplaza 'TU_BUSINESS_ID' con el ID del negocio
-- 2. Ajusta las fechas según necesites
-- 3. Modifica los recursos (canchas/especialistas) según tu negocio

DO $$
DECLARE
    v_business_id TEXT := 'spa-zen'; -- 👈 CAMBIA ESTO por el ID de tu negocio
    v_resource_id UUID;
    v_resource_ids UUID[];
    v_booking_date DATE;
    v_start_time TIME;
    v_end_time TIME;
    v_customer_names TEXT[] := ARRAY[
        'Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana Martínez',
        'Luis Fernández', 'Laura Sánchez', 'Diego López', 'Sofía García',
        'Martín Torres', 'Valentina Ruiz', 'Lucas Silva', 'Camila Díaz'
    ];
    v_customer_phones TEXT[] := ARRAY[
        '3804123456', '3804234567', '3804345678', '3804456789',
        '3804567890', '3804678901', '3804789012', '3804890123',
        '3804901234', '3804012345', '3804112345', '3804212345'
    ];
    v_customer_emails TEXT[] := ARRAY[
        'juan.perez@email.com', 'maria.gonzalez@email.com', 'carlos.rodriguez@email.com',
        'ana.martinez@email.com', 'luis.fernandez@email.com', 'laura.sanchez@email.com',
        'diego.lopez@email.com', 'sofia.garcia@email.com', 'martin.torres@email.com',
        'valentina.ruiz@email.com', 'lucas.silva@email.com', 'camila.diaz@email.com'
    ];
    v_statuses TEXT[] := ARRAY['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled'];
    v_random_idx INTEGER;
    v_random_status TEXT;
    v_days_offset INTEGER;
    v_hour INTEGER;
BEGIN
    RAISE NOTICE '🔄 Iniciando creación de reservas para negocio: %', v_business_id;

    -- Obtener todos los recursos (canchas/especialistas) del negocio
    SELECT ARRAY_AGG(id) INTO v_resource_ids
    FROM resources
    WHERE business_id = v_business_id;

    IF v_resource_ids IS NULL OR array_length(v_resource_ids, 1) = 0 THEN
        RAISE EXCEPTION '❌ No se encontraron recursos para el negocio: %', v_business_id;
    END IF;

    RAISE NOTICE '✅ Encontrados % recursos', array_length(v_resource_ids, 1);

    -- Generar reservas para los próximos 30 días
    FOR v_days_offset IN -7..30 LOOP
        v_booking_date := CURRENT_DATE + (v_days_offset || ' days')::INTERVAL;
        
        -- Saltar domingos (opcional)
        IF EXTRACT(DOW FROM v_booking_date) = 0 THEN
            CONTINUE;
        END IF;

        -- Generar 3-8 reservas por día
        FOR i IN 1..(3 + floor(random() * 6)::INTEGER) LOOP
            -- Seleccionar recurso aleatorio
            v_random_idx := 1 + floor(random() * array_length(v_resource_ids, 1))::INTEGER;
            v_resource_id := v_resource_ids[v_random_idx];

            -- Generar hora aleatoria entre 9:00 y 20:00
            v_hour := 9 + floor(random() * 12)::INTEGER;
            v_start_time := (v_hour || ':00:00')::TIME;
            v_end_time := ((v_hour + 1) || ':00:00')::TIME;

            -- Seleccionar cliente aleatorio
            v_random_idx := 1 + floor(random() * array_length(v_customer_names, 1))::INTEGER;

            -- Seleccionar estado aleatorio (80% confirmadas, 15% pendientes, 5% canceladas)
            v_random_status := CASE 
                WHEN random() < 0.80 THEN 'confirmed'
                WHEN random() < 0.95 THEN 'pending'
                ELSE 'cancelled'
            END;

            -- Insertar reserva
            BEGIN
                INSERT INTO bookings (
                    business_id,
                    resource_id,
                    customer_name,
                    customer_phone,
                    customer_email,
                    booking_date,
                    start_time,
                    end_time,
                    status,
                    total_price,
                    notes,
                    created_at
                ) VALUES (
                    v_business_id,
                    v_resource_id,
                    v_customer_names[v_random_idx],
                    v_customer_phones[v_random_idx],
                    v_customer_emails[v_random_idx],
                    v_booking_date,
                    v_start_time,
                    v_end_time,
                    v_random_status,
                    5000 + floor(random() * 10000)::INTEGER, -- Precio aleatorio entre $5,000 y $15,000
                    CASE 
                        WHEN random() < 0.3 THEN 'Reserva generada automáticamente para pruebas'
                        ELSE NULL
                    END,
                    NOW() - (floor(random() * 30)::INTEGER || ' days')::INTERVAL
                );
            EXCEPTION
                WHEN unique_violation THEN
                    -- Ignorar si ya existe una reserva en ese horario
                    CONTINUE;
                WHEN OTHERS THEN
                    RAISE NOTICE '⚠️  Error insertando reserva: %', SQLERRM;
            END;
        END LOOP;
    END LOOP;

    -- Mostrar resumen
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ RESERVAS CREADAS EXITOSAMENTE';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '';
    
    -- Contar reservas por estado
    FOR v_random_status IN SELECT DISTINCT status FROM bookings WHERE business_id = v_business_id LOOP
        SELECT COUNT(*) INTO v_random_idx
        FROM bookings
        WHERE business_id = v_business_id AND status = v_random_status;
        
        RAISE NOTICE '   📊 %: % reservas', UPPER(v_random_status), v_random_idx;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '   📅 Rango de fechas: % a %', 
        (SELECT MIN(booking_date) FROM bookings WHERE business_id = v_business_id),
        (SELECT MAX(booking_date) FROM bookings WHERE business_id = v_business_id);
    RAISE NOTICE '';

END $$;

-- Verificar las reservas creadas
SELECT 
    booking_date,
    COUNT(*) as total_reservas,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmadas,
    COUNT(*) FILTER (WHERE status = 'pending') as pendientes,
    COUNT(*) FILTER (WHERE status = 'cancelled') as canceladas
FROM bookings
WHERE business_id = 'spa-zen' -- 👈 CAMBIA ESTO
GROUP BY booking_date
ORDER BY booking_date
LIMIT 10;
