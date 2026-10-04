-- Limpiar todas las reservas y clientes para empezar de nuevo

-- Borrar todas las reservas
DELETE FROM bookings;

-- Borrar todos los clientes
DELETE FROM customers;

-- Verificar que se borraron
SELECT 'Bookings restantes:' as info, COUNT(*) as count FROM bookings
UNION ALL
SELECT 'Customers restantes:' as info, COUNT(*) as count FROM customers;
