-- Seguridad etapa 2: frenar reservas falsas.
-- Para todas las reservas públicas (canchas, servicios y alquileres), la base controla:
--   - teléfono válido (10 a 13 dígitos) y fecha que no haya pasado
--   - días de anticipación (los del negocio, o 90 si no configuró)
--   - máximo de reservas pendientes por teléfono en el negocio (3, o booking_rules.limits.max_pending)
--   - tope por negocio: 30 reservas pendientes nuevas cada 10 minutos
--   - tope por conexión: 15 reservas por hora en todo TurnitosLR (la IP se guarda solo como hash)
-- El dueño, su vendedor o el SuperAdmin siguen cargando turnos sin estas restricciones.

-- Sondeo temporal de encabezados usado para elegir la IP; queda sin acceso
DO $$
BEGIN
    IF to_regprocedure('public.tmp_request_ip_probe()') IS NOT NULL THEN
        REVOKE EXECUTE ON FUNCTION public.tmp_request_ip_probe() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.public_booking_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_booking_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_booking_attempts FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS public_booking_attempts_ip_created_idx
    ON public.public_booking_attempts (ip_hash, created_at);

CREATE OR REPLACE FUNCTION public.guard_public_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_rules jsonb;
    v_capacity integer;
    v_specialists integer;
    v_buffer integer;
    v_min_hours numeric;
    v_max_days integer;
    v_max_day integer;
    v_max_week integer;
    v_max_pending integer;
    v_phone text;
    v_week_start date;
    v_today date;
    v_count integer;
    v_type text;
    v_headers jsonb;
    v_ip text;
    v_ip_hash text;
BEGIN
    -- El dueño, su vendedor o el SuperAdmin cargan turnos sin estas restricciones
    IF public.can_manage_business(NEW.business_id) THEN
        RETURN NEW;
    END IF;

    -- Una reserva por vez en cada negocio, para que dos clientes no tomen el mismo lugar
    PERFORM pg_advisory_xact_lock(hashtext('booking:' || NEW.business_id));

    SELECT coalesce(b.booking_rules, '{}'::jsonb), coalesce(nullif(b.capacity, 0), 1), b.type
    INTO v_rules, v_capacity, v_type
    FROM public.businesses b
    WHERE b.id = NEW.business_id;

    v_buffer := coalesce(nullif(v_rules #>> '{time,buffer_minutes}', '')::integer, 0);
    v_today := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    v_max_days := coalesce(nullif(v_rules #>> '{advance_booking,max_days}', '')::integer, 0);
    v_max_pending := coalesce(nullif(v_rules #>> '{limits,max_pending}', '')::integer, 3);

    -- Controles comunes a todos los rubros
    v_phone := regexp_replace(coalesce(NEW.customer_phone, ''), '\D', '', 'g');
    IF length(v_phone) < 10 OR length(v_phone) > 13 THEN
        RAISE EXCEPTION 'Ingresá un número de teléfono válido, con la característica (por ejemplo 380 4123456).';
    END IF;

    IF NEW.date IS NOT NULL AND NEW.date < v_today THEN
        RAISE EXCEPTION 'Esa fecha ya pasó. Elegí otra.';
    END IF;

    IF NEW.date IS NOT NULL AND NEW.date > v_today + (CASE WHEN v_max_days > 0 THEN v_max_days ELSE 90 END) THEN
        RAISE EXCEPTION 'Solo se pueden hacer reservas con hasta % días de anticipación.',
            CASE WHEN v_max_days > 0 THEN v_max_days ELSE 90 END;
    END IF;

    IF v_max_pending > 0 THEN
        SELECT count(*) INTO v_count
        FROM public.bookings b
        WHERE b.business_id = NEW.business_id
          AND b.status = 'pending'
          AND coalesce(b.end_time, (b.date + 1)::timestamptz) > now()
          AND regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g') = v_phone;
        IF v_count >= v_max_pending THEN
            RAISE EXCEPTION 'Ya tenés % reserva(s) sin confirmar en este negocio. Esperá a que te las confirmen para pedir otra.', v_count;
        END IF;
    END IF;

    SELECT count(*) INTO v_count
    FROM public.bookings b
    WHERE b.business_id = NEW.business_id
      AND b.status = 'pending'
      AND b.created_at > now() - interval '10 minutes';
    IF v_count >= 30 THEN
        RAISE EXCEPTION 'Este negocio está recibiendo muchas reservas en este momento. Probá de nuevo en unos minutos.';
    END IF;

    -- Tope por conexión (Cloudflare pone la IP real del cliente en cf-connecting-ip)
    BEGIN
        v_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
    EXCEPTION WHEN others THEN
        v_headers := '{}'::jsonb;
    END;
    v_ip := trim(split_part(coalesce(v_headers->>'cf-connecting-ip', v_headers->>'x-forwarded-for', ''), ',', 1));
    IF v_ip <> '' THEN
        v_ip_hash := encode(extensions.digest(v_ip || ':turnitoslr', 'sha256'), 'hex');

        SELECT count(*) INTO v_count
        FROM public.public_booking_attempts a
        WHERE a.ip_hash = v_ip_hash
          AND a.created_at > now() - interval '1 hour';
        IF v_count >= 15 THEN
            RAISE EXCEPTION 'Hiciste muchas reservas seguidas. Probá de nuevo más tarde.';
        END IF;

        INSERT INTO public.public_booking_attempts (ip_hash) VALUES (v_ip_hash);
    END IF;

    -- Canchas: solo se controla que la cancha esté libre (los bloqueos del negocio también ocupan)
    IF v_type = 'sport' THEN
        IF NEW.court_id IS NULL AND NEW.resource_id IS NULL THEN
            RETURN NEW;
        END IF;
        IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
            RAISE EXCEPTION 'Falta la fecha o el horario del turno.';
        END IF;
        IF NEW.end_time <= now() THEN
            RAISE EXCEPTION 'Ese horario ya pasó. Elegí otro.';
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.business_id = NEW.business_id
              AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected')
              AND (
                  (NEW.court_id IS NOT NULL AND b.court_id = NEW.court_id)
                  OR (NEW.court_id IS NULL AND b.resource_id = NEW.resource_id)
                  OR (b.status = 'blocked' AND b.court_id IS NULL AND b.resource_id IS NULL AND b.service_id IS NULL)
              )
              AND b.start_time < NEW.end_time + make_interval(mins => v_buffer)
              AND b.end_time + make_interval(mins => v_buffer) > NEW.start_time
        ) THEN
            RAISE EXCEPTION 'Este turno ya está reservado. Elegí otro horario.';
        END IF;
        RETURN NEW;
    END IF;

    -- El resto de las reglas, por ahora solo para negocios de servicios (alquileres tienen su propio flujo)
    IF v_type IS DISTINCT FROM 'service' THEN
        RETURN NEW;
    END IF;

    IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
        RAISE EXCEPTION 'Falta la fecha o el horario del turno.';
    END IF;

    v_min_hours := coalesce(nullif(v_rules #>> '{advance_booking,min_hours}', '')::numeric, 0);
    v_max_day   := coalesce(nullif(v_rules #>> '{limits,max_per_day}', '')::integer, 0);
    v_max_week  := coalesce(nullif(v_rules #>> '{limits,max_per_week}', '')::integer, 0);

    -- Anticipación mínima
    IF NEW.start_time <= now() + make_interval(secs => v_min_hours * 3600) THEN
        IF v_min_hours > 0 THEN
            RAISE EXCEPTION 'Este negocio requiere reservar con al menos % hora(s) de anticipación.', v_min_hours;
        END IF;
        RAISE EXCEPTION 'Ese horario ya pasó. Elegí otro.';
    END IF;

    -- Límite por teléfono
    IF v_max_day > 0 THEN
        SELECT count(*) INTO v_count
        FROM public.bookings b
        WHERE b.business_id = NEW.business_id
          AND b.date = NEW.date
          AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected', 'blocked')
          AND regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g') = v_phone;
        IF v_count >= v_max_day THEN
            RAISE EXCEPTION 'Llegaste al límite de % reserva(s) por día con este teléfono.', v_max_day;
        END IF;
    END IF;
    IF v_max_week > 0 THEN
        v_week_start := NEW.date - ((extract(isodow FROM NEW.date)::integer) - 1);
        SELECT count(*) INTO v_count
        FROM public.bookings b
        WHERE b.business_id = NEW.business_id
          AND b.date BETWEEN v_week_start AND v_week_start + 6
          AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected', 'blocked')
          AND regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g') = v_phone;
        IF v_count >= v_max_week THEN
            RAISE EXCEPTION 'Llegaste al límite de % reserva(s) por semana con este teléfono.', v_max_week;
        END IF;
    END IF;

    -- Lugar libre (los turnos bloqueados por el negocio también ocupan)
    IF NEW.specialist_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.specialist_id = NEW.specialist_id
              AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected')
              AND b.start_time < NEW.end_time + make_interval(mins => v_buffer)
              AND b.end_time + make_interval(mins => v_buffer) > NEW.start_time
        ) THEN
            RAISE EXCEPTION 'Ese horario ya no está disponible con ese profesional. Elegí otro.';
        END IF;
    ELSIF NEW.court_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.court_id = NEW.court_id
              AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected')
              AND b.start_time < NEW.end_time + make_interval(mins => v_buffer)
              AND b.end_time + make_interval(mins => v_buffer) > NEW.start_time
        ) THEN
            RAISE EXCEPTION 'Este turno ya está reservado. Elegí otro horario.';
        END IF;
    ELSE
        SELECT count(*) INTO v_specialists
        FROM public.specialists s
        WHERE s.business_id = NEW.business_id;

        SELECT count(*) INTO v_count
        FROM public.bookings b
        WHERE b.business_id = NEW.business_id
          AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected')
          AND b.start_time < NEW.end_time + make_interval(mins => v_buffer)
          AND b.end_time + make_interval(mins => v_buffer) > NEW.start_time;

        IF v_count >= greatest(v_capacity, v_specialists) THEN
            RAISE EXCEPTION 'Ese horario ya no tiene lugar. Elegí otro.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
