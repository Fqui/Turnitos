-- Verificar relaciones business_subcategories para Salud, Alquileres y Mascotas
SELECT 
    b.name as negocio,
    c.name as categoria,
    s.name as subcategoria,
    s.slug as subcat_slug
FROM business_subcategories bs
JOIN businesses b ON bs.business_id = b.id
JOIN subcategories s ON bs.subcategory_id = s.id
JOIN categories c ON s.category_id = c.id
WHERE c.slug IN ('salud', 'alquileres', 'mascotas')
ORDER BY c.name, b.name;
