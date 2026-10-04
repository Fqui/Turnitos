-- Limpieza de tablas y vistas sin uso.
--
-- Ninguna rama del repo, edge function ni función de la base las consulta:
--   * amenities / business_amenities: las comodidades viven en businesses.amenities.
--   * bookings_analytics (+ trigger y vista resumen): se llena en cada reserva pero
--     nadie la lee; las estadísticas se calculan desde bookings.
--   * Vistas *_public (salvo bookings_public): sin uso y marcadas SECURITY DEFINER.
--
-- Antes de borrar, se copian las tablas con datos al esquema "backup" (fuera de la
-- API), para poder restaurarlas si hiciera falta.

begin;

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;

create table backup.amenities_20261004 as table public.amenities;
create table backup.bookings_analytics_20261004 as table public.bookings_analytics;

-- Analytics: primero el trigger, después la función, la vista y la tabla.
drop trigger if exists trigger_sync_booking_to_analytics on public.bookings;
drop function if exists public.sync_booking_to_analytics();
drop view if exists public.v_bookings_analytics_summary;
drop table if exists public.bookings_analytics;

-- Comodidades (business_amenities tiene FK hacia amenities).
drop table if exists public.business_amenities;
drop table if exists public.amenities;

-- Vistas públicas sin uso. bookings_public se mantiene: la usa bookingService.
drop view if exists public.businesses_public;
drop view if exists public.specialists_public;
drop view if exists public.services_public;
drop view if exists public.resources_public;
drop view if exists public.subscription_plans_public;

commit;
