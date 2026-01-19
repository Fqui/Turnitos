-- ============================================
-- DIAGNÓSTICO: Verificar estado de Spa Zen
-- ============================================

-- 1. Ver servicios
SELECT id, name, duration, price
FROM services
WHERE business_id = 'spa-zen'
ORDER BY name;

-- 2. Ver especialistas
SELECT id, name, role
FROM specialists
WHERE business_id = 'spa-zen'
ORDER BY name;

-- 3. Ver relaciones servicio-especialista (si existen)
SELECT 
    ss.service_id,
    s.name as service_name,
    ss.specialist_id,
    sp.name as specialist_name
FROM service_specialists ss
JOIN services s ON s.id = ss.service_id
JOIN specialists sp ON sp.id = ss.specialist_id
WHERE s.business_id = 'spa-zen';

-- 4. Ver reservas existentes
SELECT 
    id,
    date,
    time,
    status,
    customer_name,
    specialist_id,
    resource_id,
    price
FROM bookings
WHERE business_id = 'spa-zen'
AND date >= CURRENT_DATE
ORDER BY date, time;

-- 5. Ver recursos (si existen)
SELECT id, name, type
FROM resources
WHERE business_id = 'spa-zen';
