-- Avisos Web Push (VAPID) al negocio cuando entra una reserva de un cliente.
--
-- Reemplaza el esquema viejo de Firebase: cada fila guarda una suscripción
-- PushManager (endpoint + claves) del navegador del dueño/encargado.
-- Un trigger en bookings llama vía pg_net a la edge function notify-new-booking.
--
-- Secretos en Supabase Vault (se cargan aparte, NUNCA en este archivo):
--   push_notify_url      URL de la edge function notify-new-booking
--   push_webhook_secret  secreto compartido trigger -> edge function (header x-webhook-secret)
--   vapid_public_key     clave pública VAPID (la misma que VITE_VAPID_PUBLIC_KEY)
--   vapid_private_key    clave privada VAPID
--   vapid_subject        mailto: de contacto para los servicios push

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- 1. push_subscriptions con formato Web Push
-- ---------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions
    ADD COLUMN IF NOT EXISTS endpoint text,
    ADD COLUMN IF NOT EXISTS p256dh text,
    ADD COLUMN IF NOT EXISTS auth text,
    ADD COLUMN IF NOT EXISTS user_agent text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Los tokens de FCM no sirven para Web Push
DELETE FROM public.push_subscriptions WHERE endpoint IS NULL;

ALTER TABLE public.push_subscriptions
    ALTER COLUMN token DROP NOT NULL,
    ALTER COLUMN business_id SET NOT NULL,
    ALTER COLUMN endpoint SET NOT NULL,
    ALTER COLUMN p256dh SET NOT NULL,
    ALTER COLUMN auth SET NOT NULL;

ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_business_id_token_key;
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_key;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_business ON public.push_subscriptions (business_id);

-- RLS: solo quien gestiona el negocio (misma lógica que push_manager_all)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses can manage their own push tokens" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_manager_all" ON public.push_subscriptions;
CREATE POLICY "push_manager_all" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (public.can_manage_business(business_id))
    WITH CHECK (public.can_manage_business(business_id));

REVOKE ALL ON public.push_subscriptions FROM anon;

-- ---------------------------------------------------------------------------
-- 2. Guardar la suscripción del dispositivo
-- ---------------------------------------------------------------------------
-- El endpoint identifica al navegador: si ese navegador antes recibía avisos de
-- otro negocio (cambio de cuenta), pasa al negocio actual.
CREATE OR REPLACE FUNCTION public.save_push_subscription(
    p_business_id text,
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    IF NOT public.can_manage_business(p_business_id) THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR coalesce(p_p256dh, '') = '' OR coalesce(p_auth, '') = '' THEN
        RAISE EXCEPTION 'Suscripción inválida' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.push_subscriptions (business_id, endpoint, p256dh, auth, user_agent, device_type, last_updated)
    VALUES (p_business_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300), 'web', now())
    ON CONFLICT (endpoint) DO UPDATE
        SET business_id = EXCLUDED.business_id,
            p256dh = EXCLUDED.p256dh,
            auth = EXCLUDED.auth,
            user_agent = EXCLUDED.user_agent,
            last_updated = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Configuración para la edge function (solo service_role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_push_config()
RETURNS TABLE (webhook_secret text, vapid_public_key text, vapid_private_key text, vapid_subject text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret'),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vapid_public_key'),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vapid_private_key'),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vapid_subject');
$$;

REVOKE EXECUTE ON FUNCTION public.get_push_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_config() TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Trigger: reserva nueva de un cliente -> edge function
-- ---------------------------------------------------------------------------
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

    -- Turnos que carga el propio negocio (o su vendedor / SuperAdmin) no son novedad
    IF coalesce(NEW.metadata ->> 'booking_source', '') = 'manual'
       OR public.can_manage_business(NEW.business_id) THEN
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

DROP TRIGGER IF EXISTS trigger_90_notify_new_booking_push ON public.bookings;
CREATE TRIGGER trigger_90_notify_new_booking_push
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_booking_push();
