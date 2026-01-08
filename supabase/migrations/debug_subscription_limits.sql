-- Debug subscription space limit issue

-- 1. Ver la suscripción del negocio "Floral + SPA"
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.type as business_type,
    s.plan_name,
    s.spaces_included,
    s.spaces_used,
    s.status
FROM businesses b
LEFT JOIN subscriptions s ON b.id = s.business_id
WHERE b.name LIKE '%Floral%';

-- 2. Contar cuántos especialistas tiene realmente
SELECT 
    b.name as business_name,
    COUNT(sp.id) as total_specialists
FROM businesses b
LEFT JOIN specialists sp ON b.id = sp.business_id
WHERE b.name LIKE '%Floral%'
GROUP BY b.name;

-- 3. Ver todos los especialistas del negocio
SELECT 
    sp.id,
    sp.name,
    sp.role,
    sp.business_id
FROM specialists sp
JOIN businesses b ON sp.business_id = b.id
WHERE b.name LIKE '%Floral%';

-- 4. Actualizar spaces_used si está desincronizado
-- UPDATE subscriptions
-- SET spaces_used = (
--     SELECT COUNT(*) 
--     FROM specialists 
--     WHERE business_id = subscriptions.business_id
-- )
-- WHERE business_id IN (
--     SELECT id FROM businesses WHERE name LIKE '%Floral%'
-- );
