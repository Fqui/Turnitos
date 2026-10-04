-- Verificar canchas y recursos para el negocio 'Chelcos Club'
SELECT 
    b.name as business_name, 
    c.name as court_name,
    c.sport_type,
    c.price
FROM businesses b
LEFT JOIN courts c ON b.id = c.business_id
WHERE b.slug = 'chelcos-club' OR b.name ILIKE '%Chelcos%';

-- Verificar si existen en la tabla resources (si se usa esa)
SELECT 
    b.name as business_name,
    r.name as resource_name,
    r.type
FROM businesses b
LEFT JOIN resources r ON b.id = r.business_id
WHERE b.slug = 'chelcos-club' OR b.name ILIKE '%Chelcos%';
