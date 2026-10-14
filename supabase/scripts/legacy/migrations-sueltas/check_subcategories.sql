-- Verificar subcategorías existentes
SELECT c.name as categoria, s.name as subcategoria, s.slug
FROM subcategories s
JOIN categories c ON s.category_id = c.id
WHERE c.slug = 'belleza'
ORDER BY s.name;
