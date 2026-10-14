-- Script para eliminar SOLAMENTE las reservas
-- Esto borrará todo el historial de turnos pero mantiene intactos los negocios, servicios y configuraciones.

TRUNCATE TABLE bookings CASCADE;
