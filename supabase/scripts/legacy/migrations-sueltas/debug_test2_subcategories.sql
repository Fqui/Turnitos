-- Ver qué subcategoría tiene asignada 'test2'
SELECT 
    b.name as business_name, 
    s.name as sub_name, 
    s.slug as sub_slug 
FROM businesses b
JOIN business_subcategories bs ON b.id = bs.business_id
JOIN subcategories s ON bs.subcategory_id = s.id
WHERE b.name = 'test2';
