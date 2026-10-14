-- Perfil completo para la carga masiva de negocios.
--
-- admin_apply_business_profile(p_business_id, p_data): completa o actualiza el
--   perfil de un negocio con los campos del archivo de carga (ver
--   scripts/negocios/README.md): imágenes, tema, horarios, comodidades,
--   destacados, galería, tienda, extras, profesionales, servicios, canchas y
--   precios de alquiler. Solo toca lo que viene en p_data. Si viene
--   "servicios", reemplaza los servicios del negocio.
-- admin_seed_business(): ahora delega el perfil en esta función.

CREATE OR REPLACE FUNCTION public.admin_apply_business_profile(p_business_id text, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_type      text;
    v_pros      jsonb := coalesce(p_data->'profesionales', '[]'::jsonb);
    v_courts    jsonb := coalesce(p_data->'canchas', '[]'::jsonb);
    v_store     jsonb := p_data->'tienda';
    v_amen      text[];
    v_high      jsonb;
    v_gallery   jsonb;
    v_products  jsonb;
    v_extras    jsonb;
    v_tiers     jsonb;
    v_item      jsonb;
    v_id        text;
    i           integer;
BEGIN
    SELECT type INTO v_type FROM public.businesses WHERE id = p_business_id;
    IF v_type IS NULL THEN
        RAISE EXCEPTION 'No existe el negocio %', p_business_id;
    END IF;

    -- Comodidades: texto suelto o { nombre, icono } (icono de lucide, ver AmenityIcon.jsx)
    IF jsonb_typeof(p_data->'comodidades') = 'array' THEN
        SELECT coalesce(array_agg(CASE
                   WHEN jsonb_typeof(a) = 'object'
                       THEN jsonb_build_object('name', a->>'nombre', 'icon', coalesce(a->>'icono', 'Sparkles'))::text
                   ELSE a #>> '{}'
               END), '{}')
        INTO v_amen
        FROM jsonb_array_elements(p_data->'comodidades') a;
    END IF;

    -- Destacados (círculos tipo historia): [{ titulo, fotos[] }]
    IF jsonb_typeof(p_data->'destacados') = 'array' THEN
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                   'id', 'highlight_' || n,
                   'order', n - 1,
                   'title', h->>'titulo',
                   'images', h->'fotos',
                   'cover_image', coalesce(h->>'portada', h->'fotos'->>0)
               ) ORDER BY n), '[]'::jsonb)
        INTO v_high
        FROM jsonb_array_elements(p_data->'destacados') WITH ORDINALITY AS x(h, n);
    END IF;

    -- Galería (alquileres): [{ url, titulo, categoria, destacada }] o URLs sueltas
    IF jsonb_typeof(p_data->'galeria') = 'array' THEN
        SELECT coalesce(jsonb_agg(CASE
                   WHEN jsonb_typeof(g) = 'object' THEN jsonb_build_object(
                       'url', g->>'url',
                       'caption', coalesce(g->>'titulo', ''),
                       'category', coalesce(g->>'categoria', 'General'),
                       'is_featured', coalesce((g->>'destacada')::boolean, false))
                   ELSE jsonb_build_object('url', g #>> '{}', 'caption', '', 'category', 'General', 'is_featured', false)
               END ORDER BY n), '[]'::jsonb)
        INTO v_gallery
        FROM jsonb_array_elements(p_data->'galeria') WITH ORDINALITY AS x(g, n);
    END IF;

    -- Tienda: { banner, titulo, subtitulo, productos: [{ nombre, precio, foto, descripcion, categoria }] }
    IF jsonb_typeof(v_store->'productos') = 'array' THEN
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                   'id', (extract(epoch FROM now())::bigint * 1000 + n)::text,
                   'name', p->>'nombre',
                   'desc', coalesce(p->>'descripcion', ''),
                   'price', coalesce((p->>'precio')::numeric, 0),
                   'image', p->>'foto',
                   'images', CASE WHEN p->>'foto' IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(p->>'foto') END,
                   'category', coalesce(p->>'categoria', 'General'),
                   'is_active', true
               ) ORDER BY n), '[]'::jsonb)
        INTO v_products
        FROM jsonb_array_elements(v_store->'productos') WITH ORDINALITY AS x(p, n);
    END IF;

    -- Extras que se suman a la reserva. Alquileres y servicios los guardan distinto.
    IF jsonb_typeof(p_data->'extras') = 'array' THEN
        SELECT coalesce(jsonb_agg(CASE WHEN v_type = 'alquiler' THEN jsonb_build_object(
                       'icon', coalesce(e->>'icono', '✨'),
                       'name', e->>'nombre',
                       'price', coalesce((e->>'precio')::numeric, 0),
                       'enabled', true,
                       'description', coalesce(e->>'descripcion', ''),
                       'allow_quantity', coalesce((e->>'por_cantidad')::boolean, false))
                   ELSE jsonb_build_object(
                       'id', (extract(epoch FROM now())::bigint * 1000 + n)::text,
                       'name', e->>'nombre',
                       'desc', coalesce(e->>'descripcion', ''),
                       'price', coalesce((e->>'precio')::numeric, 0),
                       'image', e->>'foto',
                       'is_active', true)
               END ORDER BY n), '[]'::jsonb)
        INTO v_extras
        FROM jsonb_array_elements(p_data->'extras') WITH ORDINALITY AS x(e, n);
    END IF;

    -- Tarifas por cantidad de invitados (alquileres): [{ desde, hasta, precio }]
    IF jsonb_typeof(p_data->'tarifas') = 'array' THEN
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                   'min_guests', (t->>'desde')::integer,
                   'max_guests', (t->>'hasta')::integer,
                   'price', (t->>'precio')::numeric) ORDER BY n), '[]'::jsonb)
        INTO v_tiers
        FROM jsonb_array_elements(p_data->'tarifas') WITH ORDINALITY AS x(t, n);
    END IF;

    UPDATE public.businesses b SET
        description    = coalesce(nullif(trim(p_data->>'descripcion'), ''), b.description),
        logo_url       = coalesce(nullif(p_data->>'logo', ''), b.logo_url),
        logo           = coalesce(nullif(p_data->>'logo', ''), b.logo),
        banner_url     = coalesce(nullif(p_data->>'portada', ''), b.banner_url),
        banner_image   = coalesce(nullif(p_data->>'portada', ''), b.banner_image),
        theme          = coalesce(nullif(p_data->>'tema', ''), b.theme),
        primary_color  = coalesce(nullif(p_data->>'color', ''), b.primary_color),
        button_color   = coalesce(nullif(p_data->>'color', ''), b.button_color),
        hours          = CASE WHEN jsonb_typeof(p_data->'horarios') = 'object' THEN (p_data->'horarios')::text ELSE b.hours END,
        location       = coalesce(nullif(trim(p_data->>'direccion'), ''), b.location),
        whatsapp       = coalesce(nullif(trim(p_data->>'whatsapp'), ''), b.whatsapp),
        instagram      = coalesce(nullif(trim(p_data->>'instagram'), ''), b.instagram),
        facebook       = coalesce(nullif(trim(p_data->>'facebook'), ''), b.facebook),
        tiktok         = coalesce(nullif(trim(p_data->>'tiktok'), ''), b.tiktok),
        latitude       = coalesce(nullif(p_data->>'latitud', '')::double precision, b.latitude),
        longitude      = coalesce(nullif(p_data->>'longitud', '')::double precision, b.longitude),
        price_per_hour = coalesce(nullif(p_data->>'precio_hora', '')::numeric, b.price_per_hour),
        price_per_day  = coalesce(nullif(p_data->>'precio_dia', '')::numeric, b.price_per_day),
        pricing_model  = CASE WHEN nullif(p_data->>'precio_dia', '') IS NOT NULL
                               AND nullif(p_data->>'precio_hora', '') IS NULL THEN 'daily' ELSE b.pricing_model END,
        max_capacity   = coalesce(nullif(p_data->>'capacidad', '')::integer, b.max_capacity),
        capacity_limit = coalesce(nullif(p_data->>'capacidad', '')::integer, b.capacity_limit),
        amenities      = coalesce(v_amen, b.amenities),
        gallery_highlights = coalesce(v_high, b.gallery_highlights),
        gallery_images = coalesce((SELECT jsonb_agg(g->'url') FROM jsonb_array_elements(v_gallery) g), b.gallery_images),
        additional_services = coalesce(v_extras, b.additional_services),
        rental_duration_options = CASE WHEN jsonb_typeof(p_data->'duraciones') = 'array'
                                       THEN p_data->'duraciones' ELSE b.rental_duration_options END,
        pricing_tiers  = coalesce(v_tiers, b.pricing_tiers),
        store_enabled  = CASE WHEN v_products IS NOT NULL THEN jsonb_array_length(v_products) > 0 ELSE b.store_enabled END,
        service_categories = CASE WHEN jsonb_typeof(p_data->'servicios') = 'array' THEN coalesce(
                                 (SELECT array_agg(DISTINCT coalesce(nullif(s->>'categoria', ''), 'General'))
                                  FROM jsonb_array_elements(p_data->'servicios') s), '{}')
                             ELSE b.service_categories END,
        metadata = b.metadata
            || CASE WHEN coalesce((p_data->>'simulacion')::boolean, false)
                    THEN '{"simulacion": true}'::jsonb ELSE '{}'::jsonb END
            || CASE WHEN v_gallery IS NOT NULL THEN jsonb_build_object('venue_gallery', v_gallery) ELSE '{}'::jsonb END
            || CASE WHEN v_tiers IS NOT NULL THEN jsonb_build_object('pricing_tiers', v_tiers) ELSE '{}'::jsonb END
            || CASE WHEN nullif(p_data->>'capacidad', '') IS NOT NULL
                    THEN jsonb_build_object('capacity_limit', (p_data->>'capacidad')::integer) ELSE '{}'::jsonb END
            || CASE WHEN nullif(p_data->>'descripcion_larga', '') IS NOT NULL
                    THEN jsonb_build_object('full_description', p_data->>'descripcion_larga') ELSE '{}'::jsonb END
            || CASE WHEN nullif(p_data->>'descripcion', '') IS NOT NULL
                    THEN jsonb_build_object('bio_description', p_data->>'descripcion') ELSE '{}'::jsonb END
            || CASE WHEN v_products IS NOT NULL THEN jsonb_strip_nulls(jsonb_build_object(
                    'store_products', v_products,
                    'store_banner_image', v_store->>'banner',
                    'store_banners', CASE WHEN v_store->>'banner' IS NULL THEN NULL ELSE jsonb_build_array(v_store->>'banner') END,
                    'store_banner_title', v_store->>'titulo',
                    'store_banner_subtitle', v_store->>'subtitulo')) ELSE '{}'::jsonb END
            || jsonb_build_object('perfil_por_script', now())
    WHERE b.id = p_business_id;

    IF v_type = 'service' THEN
        -- Profesionales: en el orden del archivo sobre los que ya existen
        i := 0;
        FOR v_id IN
            SELECT s.id FROM public.specialists s WHERE s.business_id = p_business_id
            ORDER BY s.created_at, s.id
        LOOP
            v_item := v_pros->i;
            IF v_item IS NOT NULL THEN
                UPDATE public.specialists SET
                    name       = coalesce(v_item->>'nombre', v_item #>> '{}', name),
                    role       = coalesce(nullif(v_item->>'rol', ''), role),
                    avatar_url = coalesce(nullif(v_item->>'foto', ''), avatar_url)
                WHERE id = v_id;
            END IF;
            i := i + 1;
        END LOOP;

        IF jsonb_typeof(p_data->'servicios') = 'array' THEN
            DELETE FROM public.services WHERE business_id = p_business_id;
            INSERT INTO public.services (business_id, name, duration, price, category, description, image_url)
            SELECT p_business_id,
                   s->>'nombre',
                   coalesce(nullif(s->>'duracion', '')::integer, 30),
                   coalesce(nullif(s->>'precio', '')::numeric, 0),
                   coalesce(nullif(s->>'categoria', ''), 'General'),
                   nullif(s->>'descripcion', ''),
                   nullif(s->>'foto', '')
            FROM jsonb_array_elements(p_data->'servicios') WITH ORDINALITY AS x(s, n)
            ORDER BY n;
        END IF;
    ELSIF v_type = 'sport' THEN
        -- Canchas: nombre, precio y deporte (courts + su recurso sincronizado)
        i := 0;
        FOR v_id IN
            SELECT c.id FROM public.courts c
            JOIN public.resources r ON r.metadata->>'court_id' = c.id
            WHERE c.business_id = p_business_id
            ORDER BY r.created_at, c.name
        LOOP
            v_item := v_courts->i;
            IF v_item IS NOT NULL THEN
                UPDATE public.courts SET
                    name  = coalesce(nullif(v_item->>'nombre', ''), name),
                    price = coalesce(nullif(v_item->>'precio', '')::numeric, price),
                    sport = coalesce(nullif(public.seed_slugify(v_item->>'deporte'), ''), sport)
                WHERE id = v_id;
                UPDATE public.resources r SET
                    name = c.name, base_price = c.price, sport = c.sport, updated_at = now()
                FROM public.courts c
                WHERE c.id = v_id AND r.metadata->>'court_id' = v_id;
            END IF;
            i := i + 1;
        END LOOP;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_apply_business_profile(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_business_profile(text, jsonb) TO service_role;
