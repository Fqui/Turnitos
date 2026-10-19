-- Seguridad etapa 2 (ajuste pedido por fernando, 2026-10-19):
-- 1. Tope por conexión: 5 reservas cada 24 horas (antes 15 por hora).
-- 2. Las reservas públicas pendientes de un negocio que pide seña se cancelan solas
--    si no se pagó la seña en 2 horas. Corre cada 10 minutos con pg_cron.

DO $do$
DECLARE d text;
BEGIN
    d := pg_get_functiondef('public.guard_public_booking()'::regprocedure);
    d := replace(d, $$a.created_at > now() - interval '1 hour'$$, $$a.created_at > now() - interval '24 hours'$$);
    d := replace(d, 'IF v_count >= 15 THEN', 'IF v_count >= 5 THEN');
    d := replace(d, 'Hiciste muchas reservas seguidas. Probá de nuevo más tarde.', 'Llegaste al máximo de reservas por hoy. Probá de nuevo mañana o escribile al negocio por WhatsApp.');
    EXECUTE d;
END
$do$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_unpaid_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.bookings bk
    SET status = 'cancelled',
        cancelled_at = now(),
        updated_at = now(),
        cancellation_reason = 'Se venció el plazo de 2 horas para pagar la seña'
    FROM public.businesses b
    WHERE b.id = bk.business_id
      AND bk.status = 'pending'
      AND bk.deposit_paid_at IS NULL
      AND bk.created_at < now() - interval '2 hours'
      AND coalesce(bk.metadata->>'booking_source', '') <> 'manual'
      AND coalesce(b.payment_settings #>> '{deposit,enabled}', 'false') = 'true';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_unpaid_pending_bookings() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('expire-unpaid-pending-bookings', '*/10 * * * *', $$SELECT public.expire_unpaid_pending_bookings()$$);
