-- CHECK DATA: Verificar si se guardaron las relaciones
SELECT 
    b.name as business_name, 
    COUNT(bs.subcategory_id) as subcategories_count
FROM businesses b
LEFT JOIN business_subcategories bs ON b.id = bs.business_id
GROUP BY b.id, b.name;

-- CHECK RAW: Ver datos crudos de la tabla intermedia
SELECT * FROM business_subcategories;
