-- Horarios de ingreso en alquileres (quinchos, salones, quintas)
--
-- El dueño configura en metadata.rental_schedule:
--   {
--     "start_times": { "0": ["10:00"], "5": ["10:00", "18:00"], ... },  -- clave = día de la semana (0 = domingo)
--     "max_end": 1560                                                    -- minutos desde las 00:00 del día de la reserva (1560 = 02:00 del día siguiente); null = sin tope
--   }
-- Si no hay ningún horario cargado, el alquiler sigue funcionando como antes.
--
-- En reservas públicas de alquiler, la base controla:
--   * que la hora de ingreso sea uno de los horarios de ese día
--   * que la salida (ingreso + horas) no pase del tope
--   * que no se pise con otra reserva del espacio (puede haber varias por día)

CREATE OR REPLACE FUNCTION public.guard_public_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    v_rental jsonb;
    v_day_times jsonb;
    v_start_min integer;
    v_max_end integer;
BEGIN
    IF public.can_manage_business(NEW.business_id) THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('booking:' || NEW.business_id));

    SELECT coalesce(b.booking_rules, '{}'::jsonb), coalesce(nullif(b.capacity, 0), 1), b.type,
           coalesce(b.metadata -> 'rental_schedule', '{}'::jsonb)
    INTO v_rules, v_capacity, v_type, v_rental
    FROM public.businesses b
    WHERE b.id = NEW.business_id;

    v_buffer := coalesce(nullif(v_rules #>> '{time,buffer_minutes}', '')::integer, 0);
    v_today := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    v_max_days := coalesce(nullif(v_rules #>> '{advance_booking,max_days}', '')::integer, 0);
    v_max_pending := coalesce(nullif(v_rules #>> '{limits,max_pending}', '')::integer, 3);

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
          AND a.created_at > now() - interval '24 hours';
        IF v_count >= 5 THEN
            RAISE EXCEPTION 'Llegaste al máximo de reservas por hoy. Probá de nuevo mañana o escribile al negocio por WhatsApp.';
        END IF;

        INSERT INTO public.public_booking_attempts (ip_hash) VALUES (v_ip_hash);
    END IF;

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

    -- Alquileres con horarios de ingreso configurados
    IF v_type IN ('alquiler', 'rental', 'venue') THEN
        IF jsonb_typeof(v_rental -> 'start_times') = 'object' AND EXISTS (
            SELECT 1 FROM jsonb_each(v_rental -> 'start_times') d
            WHERE jsonb_typeof(d.value) = 'array' AND jsonb_array_length(d.value) > 0
        ) THEN
            IF NEW.date IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
                RAISE EXCEPTION 'Elegí la fecha y la hora de ingreso.';
            END IF;

            v_day_times := v_rental -> 'start_times' -> (extract(dow FROM NEW.date)::integer)::text;
            v_start_min := public.hhmm_to_minutes(NEW.time);
            IF v_start_min IS NULL OR jsonb_typeof(v_day_times) IS DISTINCT FROM 'array' OR NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(v_day_times) t
                WHERE public.hhmm_to_minutes(t) = v_start_min
            ) THEN
                RAISE EXCEPTION 'Ese horario de ingreso no está disponible ese día. Elegí otro.';
            END IF;

            v_max_end := nullif(v_rental ->> 'max_end', '')::integer;
            IF v_max_end IS NOT NULL AND v_start_min + coalesce(nullif(NEW.duration, 0), 60) > v_max_end THEN
                RAISE EXCEPTION 'Con esa cantidad de horas te pasás del horario de entrega del espacio. Elegí menos horas u otro horario.';
            END IF;

            IF NEW.start_time <= now() THEN
                RAISE EXCEPTION 'Ese horario ya pasó. Elegí otro.';
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.bookings b
                WHERE b.business_id = NEW.business_id
                  AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected')
                  AND b.start_time < NEW.end_time + make_interval(mins => v_buffer)
                  AND b.end_time + make_interval(mins => v_buffer) > NEW.start_time
            ) THEN
                RAISE EXCEPTION 'Ese horario ya está reservado. Elegí otro.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF v_type IS DISTINCT FROM 'service' THEN
        RETURN NEW;
    END IF;

    IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
        RAISE EXCEPTION 'Falta la fecha o el horario del turno.';
    END IF;

    v_min_hours := coalesce(nullif(v_rules #>> '{advance_booking,min_hours}', '')::numeric, 0);
    v_max_day   := coalesce(nullif(v_rules #>> '{limits,max_per_day}', '')::integer, 0);
    v_max_week  := coalesce(nullif(v_rules #>> '{limits,max_per_week}', '')::integer, 0);

    IF NEW.start_time <= now() + make_interval(secs => v_min_hours * 3600) THEN
        IF v_min_hours > 0 THEN
            RAISE EXCEPTION 'Este negocio requiere reservar con al menos % hora(s) de anticipación.', v_min_hours;
        END IF;
        RAISE EXCEPTION 'Ese horario ya pasó. Elegí otro.';
    END IF;

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
$function$;
