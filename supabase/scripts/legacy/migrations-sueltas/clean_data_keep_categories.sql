-- ==========================================
-- SCRIPT DE LIMPIEZA SEGURA
-- ==========================================
-- ESTE SCRIPT BORRA: Negocios, Reservas, Clientes.
-- ESTE SCRIPT MANTIENE (NO BORRA): Categorías, Subcategorías, Planes.

-- 1. Borrar datos transaccionales (Hijos)
DELETE FROM bookings_analytics;
DELETE FROM bookings;
DELETE FROM service_specialists;
DELETE FROM business_subcategories; -- Solo borra la RELACIÓN, NO las subcategorías reales
DELETE FROM promotions;

-- 2. Borrar recursos del negocio
DELETE FROM services;
DELETE FROM courts;
DELETE FROM specialists;
DELETE FROM resources;

-- 3. Borrar suscripciones activas (NO los planes)
DELETE FROM subscriptions; -- Borra la "suscripción activa" del negocio, pero el PLAN base (ej: Gold) queda intacto

-- 4. Borrar entidades principales
DELETE FROM businesses;
DELETE FROM customers;

-- ==========================================
-- VERIFICACIÓN
-- ==========================================
-- Al final, estas consultas deben dar resultados > 0
SELECT 'Categorias (Intactas)' as tipo, count(*) FROM categories
UNION ALL
SELECT 'Subcategorias (Intactas)', count(*) FROM subcategories
UNION ALL
SELECT 'Planes (Intactos)', count(*) FROM subscription_plans;
