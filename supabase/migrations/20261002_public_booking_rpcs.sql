-- Seguridad fase 2: la web pública deja de leer datos personales de reservas.
-- Las páginas públicas leen disponibilidad de bookings_public (sin nombre/teléfono/email)
-- y los límites por cliente se calculan en la base sin devolver datos.

-- bookings_public: solo lo necesario para mostrar disponibilidad (sin datos del cliente
-- ni metadata, que puede incluir notas). Se mantiene como vista "definer" a propósito:
-- expone columnas acotadas aunque la tabla bookings quede cerrada por RLS.
DROP VIEW IF EXISTS public.bookings_public;
CREATE VIEW public.bookings_public AS
SELECT
    id,
    business_id,
    service_id,
    court_id,
    resource_id,
    specialist_id,
    date,
    "time",
    duration,
    start_time,
    end_time,
    status,
    guest_count,
    created_at,
    -- solo las claves de metadata que usa el cálculo de disponibilidad
    jsonb_strip_nulls(jsonb_build_object(
        'specialist_id', metadata->'specialist_id',
        'specialist_id_raw', metadata->'specialist_id_raw',
        'duration', metadata->'duration',
        'duration_hours', metadata->'duration_hours'
    )) AS metadata
FROM public.bookings
WHERE status IS DISTINCT FROM 'cancelled';

GRANT SELECT ON public.bookings_public TO anon, authenticated;

-- Cantidad de reservas activas de un teléfono en un negocio entre dos fechas
CREATE OR REPLACE FUNCTION public.count_customer_bookings(
    p_business_id text,
    p_phone text,
    p_from date,
    p_to date
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT count(*)::integer
    FROM public.bookings b
    WHERE b.business_id = p_business_id
      AND b.date BETWEEN p_from AND p_to
      AND coalesce(b.status, '') NOT IN ('cancelled', 'rejected', 'blocked')
      AND length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) > 0
      AND regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g')
          = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
$$;

-- ¿Este teléfono ya usó este cupón en este negocio?
CREATE OR REPLACE FUNCTION public.customer_used_coupon(
    p_business_id text,
    p_phone text,
    p_code text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.business_id = p_business_id
          AND coalesce(b.status, '') <> 'cancelled'
          AND upper(coalesce(b.metadata->>'coupon_code', '')) = upper(coalesce(p_code, ''))
          AND length(coalesce(p_code, '')) > 0
          AND length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) > 0
          AND regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g')
              = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    );
$$;

GRANT EXECUTE ON FUNCTION public.count_customer_bookings(text, text, date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_used_coupon(text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reseñas por link (sin login): el cliente solo ve/escribe lo de su token.
-- ---------------------------------------------------------------------------

-- Datos para mostrar la página de reseña de un token
CREATE OR REPLACE FUNCTION public.get_review_info(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'success', true,
        'isAlreadySubmitted', coalesce((bk.metadata->>'review_submitted')::boolean, false),
        'customer_name', bk.customer_name,
        'review', bk.metadata->'review_data',
        'business', jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'logo', coalesce(b.logo, b.logo_url),
            'location', b.location,
            'slug', b.slug
        )
    )
    FROM public.bookings bk
    JOIN public.businesses b ON b.id = bk.business_id
    WHERE length(coalesce(p_token, '')) >= 8
      AND bk.metadata->>'review_token' = p_token
    LIMIT 1;
$$;

-- Reseñas publicadas de un negocio (solo nombre, puntaje, comentario y fecha)
CREATE OR REPLACE FUNCTION public.get_business_reviews(p_business_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT coalesce(jsonb_agg(r ORDER BY r->>'created_at' DESC), '[]'::jsonb)
    FROM (
        SELECT jsonb_build_object(
            'id', bk.id,
            'customer_name', bk.metadata->'review_data'->>'customer_name',
            'rating', (bk.metadata->'review_data'->>'rating')::int,
            'comment', bk.metadata->'review_data'->>'comment',
            'created_at', bk.metadata->'review_data'->>'created_at'
        ) AS r
        FROM public.bookings bk
        WHERE bk.business_id = p_business_id
          AND bk.metadata->>'review_submitted' = 'true'
          AND (bk.metadata->'review_data'->>'rating')::int > 0
    ) t;
$$;

-- Guarda la reseña de un token (una sola vez) y actualiza el rating del negocio
CREATE OR REPLACE FUNCTION public.submit_review(
    p_token text,
    p_rating integer,
    p_comment text,
    p_customer_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_booking public.bookings%ROWTYPE;
    v_rating integer := greatest(1, least(5, coalesce(p_rating, 5)));
    v_name text;
    v_reviews jsonb;
    v_avg numeric;
    v_count integer;
BEGIN
    IF length(coalesce(p_token, '')) < 8 THEN
        RAISE EXCEPTION 'Enlace de reseña no válido.';
    END IF;

    SELECT * INTO v_booking
    FROM public.bookings
    WHERE metadata->>'review_token' = p_token
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enlace de reseña no válido o expirado.';
    END IF;

    IF coalesce((v_booking.metadata->>'review_submitted')::boolean, false) THEN
        RAISE EXCEPTION 'Esta reseña ya ha sido enviada anteriormente.';
    END IF;

    v_name := left(coalesce(nullif(trim(p_customer_name), ''), v_booking.customer_name, 'Cliente'), 80);

    UPDATE public.bookings
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'review_submitted', true,
        'review_data', jsonb_build_object(
            'rating', v_rating,
            'comment', left(trim(coalesce(p_comment, '')), 1000),
            'customer_name', v_name,
            'created_at', now()
        )
    )
    WHERE id = v_booking.id;

    v_reviews := public.get_business_reviews(v_booking.business_id);
    v_count := jsonb_array_length(v_reviews);
    SELECT round(avg((x->>'rating')::numeric), 1) INTO v_avg FROM jsonb_array_elements(v_reviews) x;

    UPDATE public.businesses
    SET rating = v_avg,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'rating_avg', v_avg,
            'reviews_count', v_count
        )
    WHERE id = v_booking.business_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_review_info(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_reviews(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(text, integer, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cupones: la página pública solo puede sumar 1 uso al cupón aplicado,
-- en vez de reescribir toda la metadata del negocio.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_business_id text, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF length(coalesce(trim(p_code), '')) = 0 THEN
        RETURN;
    END IF;

    UPDATE public.businesses b
    SET metadata = jsonb_set(
        b.metadata,
        '{coupons}',
        (
            SELECT coalesce(jsonb_agg(
                CASE
                    WHEN upper(trim(c->>'code')) = upper(trim(p_code))
                    THEN c || jsonb_build_object('used_count', coalesce((c->>'used_count')::int, 0) + 1)
                    ELSE c
                END
            ), '[]'::jsonb)
            FROM jsonb_array_elements(b.metadata->'coupons') c
        )
    )
    WHERE b.id = p_business_id
      AND jsonb_typeof(b.metadata->'coupons') = 'array';
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text, text) TO anon, authenticated;
