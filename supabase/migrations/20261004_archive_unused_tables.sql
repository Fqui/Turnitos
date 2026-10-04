-- Archiva tablas y vistas que no usa ningún código (app, edge functions ni funciones de la base).
-- No se borra nada: se mueven al esquema "archive", que la API no expone.
-- Para volver atrás: ALTER TABLE archive.<tabla> SET SCHEMA public; (y ALTER VIEW igual)
-- y ALTER TABLE public.bookings ENABLE TRIGGER trigger_sync_booking_to_analytics;

CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;

-- bookings_analytics: un trigger la llena en cada reserva pero nadie la lee.
-- Se apaga el trigger antes de mover la tabla para que las reservas sigan funcionando.
ALTER TABLE public.bookings DISABLE TRIGGER trigger_sync_booking_to_analytics;

ALTER VIEW  public.v_bookings_analytics_summary SET SCHEMA archive;
ALTER TABLE public.bookings_analytics SET SCHEMA archive;

-- Comodidades: se guardan en la columna businesses.amenities, no en estas tablas.
ALTER TABLE public.business_amenities SET SCHEMA archive;
ALTER TABLE public.amenities SET SCHEMA archive;

-- Vistas públicas sin uso (además Supabase las marcaba como SECURITY DEFINER).
-- businesses_public y bookings_public se quedan: la segunda se usa y la primera
-- sirve para el arreglo de seguridad de cupones.
ALTER VIEW public.services_public SET SCHEMA archive;
ALTER VIEW public.specialists_public SET SCHEMA archive;
ALTER VIEW public.resources_public SET SCHEMA archive;
ALTER VIEW public.subscription_plans_public SET SCHEMA archive;

REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC, anon, authenticated;
