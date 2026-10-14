-- Reservas: horario real en la base y control de reservas públicas en el servidor.
--
-- 1) start_time / end_time se completan solos a partir de date + time + duration
--    (hora de Argentina). Antes quedaban siempre en NULL, así que los controles
--    de superposición de la base no hacían nada.
-- 2) Las reservas de negocios de servicios hechas desde la web pública (quien no
--    administra el negocio) se validan en el servidor: anticipación mínima y máxima, límite por teléfono,
--    profesional o cancha ocupada (con el tiempo entre turnos del negocio) y cupo.
--    Un lock por negocio evita que dos reservas simultáneas entren a la vez.
--    Las reservas que carga el dueño desde el portal no cambian de comportamiento.
-- 3) check_business_availability cuenta como cupo la cantidad de profesionales
--    (antes era 1 en todos los negocios de servicios).

-- 1) Horario real -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_booking_time_range()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    v_hhmm text;
BEGIN
    v_hhmm := substring(coalesce(NEW.time, '') FROM '^\d{1,2}:\d{2}');
    IF NEW.date IS NOT NULL AND v_hhmm IS NOT NULL THEN
        NEW.start_time := ((NEW.date::text || ' ' || v_hhmm)::timestamp)
            AT TIME ZONE 'America/Argentina/Buenos_Aires';
        NEW.end_time := NEW.start_time
            + make_interval(mins => coalesce(nullif(NEW.duration, 0), 60));
    END IF;
    RETURN NEW;
END;
$$;

-- Los triggers BEFORE corren en orden alfabético: primero el horario, después el control.
CREATE OR REPLACE TRIGGER trigger_10_set_booking_time_range
    BEFORE INSERT OR UPDATE OF date, time, duration ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.set_booking_time_range();

-- Completar las reservas existentes
UPDATE public.bookings b
SET start_time = ((b.date::text || ' ' || substring(b.time FROM '^\d{1,2}:\d{2}'))::timestamp)
        AT TIME ZONE 'America/Argentina/Buenos_Aires',
    end_time = ((b.date::text || ' ' || substring(b.time FROM '^\d{1,2}:\d{2}'))::timestamp)
        AT TIME ZONE 'America/Argentina/Buenos_Aires'
        + make_interval(mins => coalesce(nullif(b.duration, 0), 60))
WHERE b.date IS NOT NULL
  AND substring(coalesce(b.time, '') FROM '^\d{1,2}:\d{2}') IS NOT NULL;

-- 2) Control de reservas públicas ---------------------------------------------

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
    v_phone text;
    v_week_start date;
    v_today date;
    v_count integer;
    v_type text;
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

    -- Por ahora solo negocios de servicios (canchas y alquileres tienen su propio flujo)
    IF v_type IS DISTINCT FROM 'service' THEN
        RETURN NEW;
    END IF;

    IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
        RAISE EXCEPTION 'Falta la fecha o el horario del turno.';
    END IF;

    v_buffer    := coalesce(nullif(v_rules #>> '{time,buffer_minutes}', '')::integer, 0);
    v_min_hours := coalesce(nullif(v_rules #>> '{advance_booking,min_hours}', '')::numeric, 0);
    v_max_days  := coalesce(nullif(v_rules #>> '{advance_booking,max_days}', '')::integer, 0);
    v_max_day   := coalesce(nullif(v_rules #>> '{limits,max_per_day}', '')::integer, 0);
    v_max_week  := coalesce(nullif(v_rules #>> '{limits,max_per_week}', '')::integer, 0);
    v_today     := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

    -- Anticipación
    IF NEW.start_time <= now() + make_interval(secs => v_min_hours * 3600) THEN
        IF v_min_hours > 0 THEN
            RAISE EXCEPTION 'Este negocio requiere reservar con al menos % hora(s) de anticipación.', v_min_hours;
        END IF;
        RAISE EXCEPTION 'Ese horario ya pasó. Elegí otro.';
    END IF;
    IF v_max_days > 0 AND NEW.date > v_today + v_max_days THEN
        RAISE EXCEPTION 'Solo se pueden hacer reservas con hasta % días de anticipación.', v_max_days;
    END IF;

    -- Límite por teléfono
    v_phone := regexp_replace(coalesce(NEW.customer_phone, ''), '\D', '', 'g');
    IF v_phone <> '' AND v_max_day > 0 THEN
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
    IF v_phone <> '' AND v_max_week > 0 THEN
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

CREATE OR REPLACE TRIGGER trigger_20_guard_public_booking
    BEFORE INSERT ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.guard_public_booking();

-- El control viejo de "buffer" usaba 15 minutos fijos por profesional (distinto de lo
-- que configura el negocio). Ahora ese control está en guard_public_booking, así que
-- la función vieja queda sin efecto (el trigger sigue existiendo pero no hace nada).
CREATE OR REPLACE FUNCTION public.validate_buffer_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    RETURN NEW;
END;
$$;

-- 3) Cupo por cantidad de profesionales ---------------------------------------

CREATE OR REPLACE FUNCTION public.check_business_availability(
    p_business_id text,
    p_start_time timestamp with time zone,
    p_end_time timestamp with time zone,
    p_exclude_booking_id text DEFAULT NULL::text
)
RETURNS TABLE(available boolean, slots_used integer, total_capacity integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_capacity INTEGER;
    v_specialists INTEGER;
    v_used INTEGER;
BEGIN
    SELECT capacity INTO v_capacity
    FROM businesses
    WHERE id::TEXT = p_business_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business not found';
    END IF;

    SELECT count(*) INTO v_specialists FROM specialists WHERE business_id = p_business_id;
    v_capacity := greatest(coalesce(nullif(v_capacity, 0), 1), v_specialists);

    SELECT COUNT(*) INTO v_used
    FROM bookings
    WHERE business_id::TEXT = p_business_id
    AND status NOT IN ('cancelled', 'rejected')
    AND (p_exclude_booking_id IS NULL OR id::TEXT != p_exclude_booking_id)
    AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time);

    RETURN QUERY SELECT
        (v_used < v_capacity) as available,
        v_used as slots_used,
        v_capacity as total_capacity;
END;
$$;
