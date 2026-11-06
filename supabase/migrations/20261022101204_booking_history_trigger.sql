-- Applied in production on 2026-10-22 (version 20261022101204); this file is the record of it.
-- Every status or schedule change leaves a history line saying who made it, even when the panel didn't write it.
UPDATE public.bookings b
SET history = (CASE WHEN jsonb_typeof(b.history) = 'array' THEN b.history ELSE '[]'::jsonb END)
    || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'action', 'cancelled',
        'label', 'Turno Cancelado',
        'timestamp', to_char(coalesce(b.cancelled_at, b.updated_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'status', 'cancelled',
        'reason', b.cancellation_reason,
        'by', CASE WHEN b.cancellation_reason LIKE 'Se venció el plazo%' THEN 'Automático' END
    )))
WHERE b.status = 'cancelled'
  AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b.history) = 'array' THEN b.history ELSE '[]'::jsonb END) e
      WHERE e ->> 'status' = 'cancelled'
  );

CREATE OR REPLACE FUNCTION public.log_booking_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
    v_old jsonb := CASE WHEN jsonb_typeof(OLD.history) = 'array' THEN OLD.history ELSE '[]'::jsonb END;
    v_new jsonb := CASE WHEN jsonb_typeof(NEW.history) = 'array' THEN NEW.history ELSE '[]'::jsonb END;
    v_old_len int := jsonb_array_length(v_old);
    v_by text;
    v_now text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    v_has_status_entry boolean := false;
    v_has_any_new boolean;
    v_label text;
    v_action text;
    v_entry jsonb;
    v_out jsonb := '[]'::jsonb;
    i int;
BEGIN
    v_by := CASE
        WHEN auth.uid() IS NOT NULL THEN 'Negocio'
        WHEN coalesce(auth.role(), '') = 'anon' THEN 'Cliente'
        ELSE 'Automático'
    END;

    FOR i IN 0 .. jsonb_array_length(v_new) - 1 LOOP
        v_entry := v_new -> i;
        IF i >= v_old_len AND jsonb_typeof(v_entry) = 'object' AND NOT (v_entry ? 'by') THEN
            v_entry := v_entry || jsonb_build_object('by', v_by);
        END IF;
        IF i >= v_old_len AND v_entry ->> 'status' = NEW.status THEN
            v_has_status_entry := true;
        END IF;
        v_out := v_out || jsonb_build_array(v_entry);
    END LOOP;
    v_has_any_new := jsonb_array_length(v_new) > v_old_len;

    IF NEW.status IS DISTINCT FROM OLD.status AND NOT v_has_status_entry THEN
        v_action := CASE NEW.status
            WHEN 'cancelled' THEN 'cancelled'
            WHEN 'confirmed' THEN 'confirmed'
            WHEN 'deposit_paid' THEN 'deposit_paid'
            WHEN 'attended' THEN 'attendance_confirmed'
            WHEN 'completed' THEN 'completed'
            ELSE 'status_changed'
        END;
        v_label := CASE NEW.status
            WHEN 'cancelled' THEN 'Turno Cancelado'
            WHEN 'confirmed' THEN 'Turno Confirmado'
            WHEN 'deposit_paid' THEN 'Seña Confirmada'
            WHEN 'attended' THEN 'Asistencia Confirmada'
            WHEN 'completed' THEN 'Servicio Finalizado'
            WHEN 'pending' THEN 'Volvió a pendiente'
            ELSE 'Estado: ' || NEW.status
        END;
        v_out := v_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
            'action', v_action,
            'label', v_label,
            'timestamp', v_now,
            'status', NEW.status,
            'reason', CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason END,
            'by', v_by
        )));
    ELSIF (NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time) AND NOT v_has_any_new THEN
        v_out := v_out || jsonb_build_array(jsonb_build_object(
            'action', 'rescheduled',
            'label', 'Turno Reprogramado: ' || to_char(NEW.date::date, 'DD/MM') || ' ' || left(coalesce(NEW.time::text, ''), 5) || ' hs',
            'timestamp', v_now,
            'status', NEW.status,
            'by', v_by
        ));
    END IF;

    NEW.history := v_out;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_05_log_booking_history
    BEFORE UPDATE OF status, date, time, history ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.log_booking_history();
