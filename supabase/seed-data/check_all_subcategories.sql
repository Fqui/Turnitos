-- Verificar todas las subcategorías existentes
SELECT c.name as categoria, c.slug as cat_slug, s.name as subcategoria, s.slug as subcat_slug
FROM subcategories s
JOIN categories c ON s.category_id = c.id
ORDER BY c.name, s.name;
