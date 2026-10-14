-- Reservas de madrugada y canchas ocupadas.
--
-- 1) Turnos que empiezan después de las 00:00 en un horario que cruza la medianoche
--    (por ej. 18:00–02:00). La reserva se guarda con la fecha del día que abre
--    (date = lunes, time = '00:30'), pero el turno real es el martes 00:30.
--    start_time / end_time ahora suman un día cuando la hora es anterior a la apertura
--    de ese día y el horario cruza la medianoche. Se recalculan las reservas existentes.
-- 2) Las reservas públicas de canchas (negocios type 'sport') se controlan en el servidor:
--    la cancha no puede estar ocupada (con el tiempo entre turnos del negocio).
--    Lo que carga el dueño desde el portal sigue igual.

-- 1) Horario de madrugada -------------------------------------------------------

-- 'HH:MM' (también '26:00') a minutos; NULL si no tiene ese formato
CREATE OR REPLACE FUNCTION public.hhmm_to_minutes(p_time text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
    SELECT (m[1])::integer * 60 + (m[2])::integer
    FROM (SELECT regexp_match(coalesce(p_time, ''), '^\s*(\d{1,2}):(\d{2})') AS m) t
    WHERE m IS NOT NULL;
$$;

-- Minuto de apertura del día de p_date si su horario cruza la medianoche; NULL si no.
-- Lee businesses.hours (texto JSON): claves monday..sunday (o en español), con open/close,
-- open2/close2 o ranges[]. SECURITY DEFINER porque quien reserva desde la web pública
-- no puede leer la tabla de negocios; solo devuelve un número.
CREATE OR REPLACE FUNCTION public.business_overnight_open_minutes(p_business_id text, p_date date)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_hours_text text;
    v_hours jsonb;
    v_day jsonb;
    v_idx integer;
    v_open integer;
    v_close integer;
    v_first integer;
    v_crosses boolean := false;
    v_range record;
BEGIN
    IF p_business_id IS NULL OR p_date IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT b.hours INTO v_hours_text
    FROM public.businesses b
    WHERE b.id::text = p_business_id;

    IF v_hours_text IS NULL OR btrim(v_hours_text) NOT LIKE '{%' THEN
        RETURN NULL;
    END IF;

    BEGIN
        v_hours := v_hours_text::jsonb;
    EXCEPTION WHEN others THEN
        RETURN NULL;
    END;

    v_idx := extract(dow FROM p_date)::integer + 1;
    v_day := coalesce(
        v_hours -> (ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])[v_idx],
        v_hours -> (ARRAY['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'])[v_idx],
        v_hours -> (ARRAY['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'])[v_idx],
        v_hours -> (v_idx - 1)::text
    );

    IF v_day IS NULL OR jsonb_typeof(v_day) <> 'object' OR v_day ->> 'isOpen' = 'false' THEN
        RETURN NULL;
    END IF;

    FOR v_range IN
        SELECT v_day ->> 'open' AS open_time, v_day ->> 'close' AS close_time
        UNION ALL
        SELECT v_day ->> 'open2', v_day ->> 'close2'
        UNION ALL
        SELECT r ->> 'open', r ->> 'close'
        FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(v_day -> 'ranges') = 'array' THEN v_day -> 'ranges' ELSE '[]'::jsonb END
        ) r
    LOOP
        v_open := public.hhmm_to_minutes(v_range.open_time);
        v_close := public.hhmm_to_minutes(v_range.close_time);
        CONTINUE WHEN v_open IS NULL OR v_close IS NULL;
        IF v_close <= v_open OR v_close > 1440 THEN
            v_crosses := true;
        END IF;
        IF v_first IS NULL OR v_open < v_first THEN
            v_first := v_open;
        END IF;
    END LOOP;

    RETURN CASE WHEN v_crosses THEN v_first END;
END;
$$;

-- Inicio real del turno (hora de Argentina): la madrugada de un horario que cruza
-- la medianoche cae al día siguiente de date
CREATE OR REPLACE FUNCTION public.booking_start_time(p_business_id text, p_date date, p_time text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
DECLARE
    v_minutes integer;
    v_open integer;
BEGIN
    v_minutes := public.hhmm_to_minutes(p_time);
    IF p_date IS NULL OR v_minutes IS NULL THEN
        RETURN NULL;
    END IF;

    v_open := public.business_overnight_open_minutes(p_business_id, p_date);
    IF v_open IS NOT NULL AND v_minutes < v_open THEN
        v_minutes := v_minutes + 1440;
    END IF;

    RETURN (p_date::timestamp + make_interval(mins => v_minutes))
        AT TIME ZONE 'America/Argentina/Buenos_Aires';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_booking_time_range()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    v_start timestamp with time zone;
BEGIN
    v_start := public.booking_start_time(NEW.business_id::text, NEW.date, NEW.time);
    IF v_start IS NOT NULL THEN
        NEW.start_time := v_start;
        NEW.end_time := v_start + make_interval(mins => coalesce(nullif(NEW.duration, 0), 60));
    END IF;
    RETURN NEW;
END;
$$;

-- Recalcular las reservas existentes (solo las que cambian)
UPDATE public.bookings b
SET start_time = s.start_time,
    end_time = s.start_time + make_interval(mins => coalesce(nullif(b.duration, 0), 60))
FROM (
    SELECT id, public.booking_start_time(business_id::text, date, time) AS start_time
    FROM public.bookings
) s
WHERE s.id = b.id
  AND s.start_time IS NOT NULL
  AND (b.start_time IS DISTINCT FROM s.start_time
       OR b.end_time IS DISTINCT FROM s.start_time + make_interval(mins => coalesce(nullif(b.duration, 0), 60)));

-- 2) Canchas ocupadas en reservas públicas ------------------------------------

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

    v_buffer := coalesce(nullif(v_rules #>> '{time,buffer_minutes}', '')::integer, 0);

    -- Canchas: solo se controla que la cancha esté libre (los bloqueos del negocio también ocupan)
    IF v_type = 'sport' THEN
        IF NEW.court_id IS NULL AND NEW.resource_id IS NULL THEN
            RETURN NEW;
        END IF;
        IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
            RAISE EXCEPTION 'Falta la fecha o el horario del turno.';
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
