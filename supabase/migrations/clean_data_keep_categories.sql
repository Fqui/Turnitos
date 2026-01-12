-- Script para limpiar todos los datos de la BD excepto categorías y subcategorías
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- LIMPIAR DATOS DE NEGOCIOS Y RELACIONADOS
-- ============================================

-- 1. Eliminar todas las reservas (bookings)
DELETE FROM bookings;

-- 2. Eliminar relaciones service_specialists
DELETE FROM service_specialists;

-- 3. Eliminar servicios
DELETE FROM services;

-- 4. Eliminar canchas
DELETE FROM courts;

-- 5. Eliminar especialistas
DELETE FROM specialists;

-- 6. Eliminar recursos (resources table si existe)
DELETE FROM resources;

-- 7. Eliminar negocios
DELETE FROM businesses;

-- 8. Eliminar promociones
DELETE FROM promotions;

-- ============================================
-- MANTENER: Categorías, Subcategorías y Planes de Suscripción
-- ============================================
-- NO se eliminan las siguientes tablas:
-- - categories (se mantienen)
-- - subcategories (se mantienen)
-- - subscription_plans (se mantienen)

-- ============================================
-- RESETEAR SECUENCIAS (si aplica)
-- ============================================
-- Si tienes columnas con secuencias auto-incrementales, 
-- puedes resetearlas aquí (no aplica para UUIDs)

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas queries para verificar que se limpiaron los datos:

-- SELECT COUNT(*) FROM bookings;           -- Debe ser 0
-- SELECT COUNT(*) FROM services;           -- Debe ser 0
-- SELECT COUNT(*) FROM courts;             -- Debe ser 0
-- SELECT COUNT(*) FROM specialists;        -- Debe ser 0
-- SELECT COUNT(*) FROM businesses;         -- Debe ser 0
-- SELECT COUNT(*) FROM promotions;         -- Debe ser 0
-- SELECT COUNT(*) FROM categories;         -- Debe tener registros
-- SELECT COUNT(*) FROM subcategories;      -- Debe tener registros
-- SELECT COUNT(*) FROM subscription_plans; -- Debe tener registros

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Este script es IRREVERSIBLE - asegúrate de tener un backup si es necesario
-- 2. Las categorías y subcategorías se mantienen intactas
-- 3. Si tienes archivos en Supabase Storage, deberás eliminarlos manualmente
-- 4. Ejecuta este script en el SQL Editor de Supabase
