-- Script de Diagnóstico para Spa Zen
-- Ejecuta esto y comparte el resultado completo

DO $$
DECLARE
    v_count_specialists INTEGER;
    v_count_bookings INTEGER;
    v_business_id TEXT := 'spa-zen';
BEGIN
    RAISE NOTICE '🔍 DIAGNÓSTICO PARA SPA ZEN';
    RAISE NOTICE '===========================';

    -- 1. Verificar Especialistas
    SELECT COUNT(*) INTO v_count_specialists FROM specialists WHERE business_id = v_business_id;
    RAISE NOTICE '👤 Especialistas encontrados: %', v_count_specialists;

    -- 2. Verificar Reservas
    SELECT COUNT(*) INTO v_count_bookings FROM bookings WHERE business_id = v_business_id;
    RAISE NOTICE '📅 Reservas encontradas (total): %', v_count_bookings;

    -- 3. Verificar Reservas Futuras (desde hoy)
    SELECT COUNT(*) INTO v_count_bookings FROM bookings WHERE business_id = v_business_id AND date >= CURRENT_DATE;
    RAISE NOTICE '📅 Reservas futuras (desde hoy): %', v_count_bookings;

    RAISE NOTICE '';
END $$;

-- 4. Ver estructura de la tabla bookings (nombres de columnas y tipos)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- 5. Ver las últimas 5 reservas intentadas (si hay)
SELECT id, business_id, date, time, status, specialist_id, resource_id, price 
FROM bookings 
WHERE business_id = 'spa-zen' 
ORDER BY created_at DESC 
LIMIT 5;
