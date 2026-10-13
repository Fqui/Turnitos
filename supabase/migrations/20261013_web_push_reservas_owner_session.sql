-- Avisos push: no descartar una reserva de la página pública solo porque el
-- navegador tenía abierta la sesión del dueño (o del SuperAdmin). Los turnos
-- que carga el negocio desde el portal ya vienen con booking_source = 'manual'
-- y los bloqueos con status = 'blocked'.
CREATE OR REPLACE FUNCTION public.notify_new_booking_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_url text;
    v_secret text;
BEGIN
    -- Bloqueos y estados que no son una reserva nueva
    IF coalesce(NEW.status, '') IN ('blocked', 'cancelled', 'rejected') THEN
        RETURN NEW;
    END IF;

    -- Turnos que carga el propio negocio desde el portal no son novedad
    IF coalesce(NEW.metadata ->> 'booking_source', '') = 'manual' THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.business_id = NEW.business_id) THEN
        RETURN NEW;
    END IF;

    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'push_notify_url';
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';
    IF v_url IS NULL OR v_secret IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object('booking_id', NEW.id),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
        timeout_milliseconds := 8000
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Un aviso que falla nunca debe impedir la reserva
    RAISE WARNING 'notify_new_booking_push: %', SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_booking_push() FROM PUBLIC, anon, authenticated;
