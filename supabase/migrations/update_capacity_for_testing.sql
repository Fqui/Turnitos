-- Script para actualizar la capacidad de un recurso para testing
-- Esto te permitirá probar con capacity = 2

-- Ver todos los recursos disponibles
SELECT id, name, type, capacity, business_id 
FROM resources 
WHERE active = true 
ORDER BY type, name;

-- Actualizar la capacidad de un recurso específico a 2
-- Reemplaza 'RESOURCE_ID_AQUI' con el ID del recurso que quieras probar
-- UPDATE resources 
-- SET capacity = 2 
-- WHERE id = 'RESOURCE_ID_AQUI';

-- Ejemplo: Actualizar TODOS los recursos de tipo 'court' a capacity = 2
-- UPDATE resources 
-- SET capacity = 2 
-- WHERE type = 'court';

-- Verificar el cambio
-- SELECT id, name, type, capacity FROM resources WHERE type = 'court';
