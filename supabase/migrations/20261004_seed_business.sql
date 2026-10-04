-- Carga masiva de negocios (script scripts/negocios/cargar-negocios.mjs).
--
-- admin_seed_business(p_data): crea la cuenta del dueño, llama a
--   admin_create_business() (misma alta que los formularios) y completa el
--   perfil: descripción, horarios, imágenes, profesionales, servicios, canchas
--   y precios. Todo en una transacción: si algo falla no queda nada a medias.
-- admin_delete_simulated_businesses(): borra los negocios cargados con
--   "simulacion": true y sus cuentas.
--
-- Solo los puede ejecutar service_role (o el editor SQL de Supabase).
-- Depende de admin_create_business() (migración 20261004_business_onboarding).

CREATE OR REPLACE FUNCTION public.seed_slugify(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT left(
        trim(BOTH '-' FROM regexp_replace(
            regexp_replace(
                translate(lower(coalesce(p_text, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
                '[^a-z0-9]+', '-', 'g'),
            '-+', '-', 'g')),
        50);
$$;

CREATE OR REPLACE FUNCTION public.admin_seed_business(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_category_id  uuid;
    v_category     text := public.seed_slugify(p_data->>'rubro');
    v_name         text := trim(coalesce(p_data->>'nombre', ''));
    v_base_slug    text;
    v_slug         text;
    v_email        text;
    v_password     text;
    v_user_id      uuid := gen_random_uuid();
    v_sub_ids      jsonb;
    v_pros         jsonb := coalesce(p_data->'profesionales', '[]'::jsonb);
    v_courts       jsonb := coalesce(p_data->'canchas', '[]'::jsonb);
    v_services     jsonb := coalesce(p_data->'servicios', '[]'::jsonb);
    v_count        integer;
    v_created      jsonb;
    v_business_id  text;
    v_type         text;
    v_item         jsonb;
    v_spec_id      text;
    v_court_id     text;
    i              integer;
BEGIN
    IF v_name = '' THEN
        RAISE EXCEPTION 'Falta el nombre del negocio';
    END IF;

    -- Rubro: acepta el slug de la categoría o sus nombres comunes
    v_category := CASE v_category
        WHEN 'canchas' THEN 'deportes'
        WHEN 'deporte' THEN 'deportes'
        WHEN 'alquiler' THEN 'alquileres'
        ELSE v_category
    END;
    SELECT c.id INTO v_category_id FROM public.categories c WHERE c.slug = v_category;
    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Rubro "%" no existe (usá canchas, belleza, salud, alquileres o mascotas)', p_data->>'rubro';
    END IF;

    -- Subcategorías por nombre, sin importar tildes ni mayúsculas
    SELECT coalesce(jsonb_agg(s.id), '[]'::jsonb) INTO v_sub_ids
    FROM public.subcategories s
    WHERE s.category_id = v_category_id
      AND public.seed_slugify(s.name) IN (
          SELECT public.seed_slugify(x) FROM jsonb_array_elements_text(coalesce(p_data->'subcategorias', '[]'::jsonb)) x
      );
    IF jsonb_array_length(coalesce(p_data->'subcategorias', '[]'::jsonb)) > jsonb_array_length(v_sub_ids) THEN
        RAISE EXCEPTION 'Alguna subcategoría de "%" no existe en el rubro %', v_name, v_category;
    END IF;

    -- Slug único (es el subdominio: slug.turnitoslr.com)
    v_base_slug := coalesce(nullif(public.seed_slugify(p_data->>'slug'), ''), public.seed_slugify(v_name));
    IF v_base_slug IN ('admin', 'login', 'portal', 'business-portal', 'ayuda', 'negocios', 'colaboradores',
                       'terminos', 'privacidad', 'calificar', 'review', 'api', 'assets', 'www', '') THEN
        v_base_slug := v_base_slug || '-negocio';
    END IF;
    v_slug := v_base_slug;
    i := 2;
    WHILE EXISTS (SELECT 1 FROM public.businesses WHERE slug = v_slug) LOOP
        v_slug := v_base_slug || '-' || i;
        i := i + 1;
    END LOOP;

    v_email := lower(coalesce(nullif(trim(p_data->>'email'), ''), v_slug || '@turnitoslr.com'));
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email)
       OR EXISTS (SELECT 1 FROM public.businesses WHERE lower(email) = v_email) THEN
        RAISE EXCEPTION 'El email % ya está en uso', v_email;
    END IF;

    -- Contraseña provisoria; el dueño la cambia en el primer ingreso (password_changed = false)
    v_password := 'Turni-' || substr(translate(encode(gen_random_bytes(9), 'base64'), '+/=', 'xyz'), 1, 8);

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        v_email, crypt(v_password, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, now(), now(),
        '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
        v_user_id::text, v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
        'email', now(), now(), now()
    );

    v_count := greatest(1, jsonb_array_length(v_pros), jsonb_array_length(v_courts),
                        coalesce(nullif(p_data->>'cantidad', '')::integer, 1));

    v_created := public.admin_create_business(v_user_id, jsonb_build_object(
        'name', v_name,
        'slug', v_slug,
        'email', v_email,
        'category_id', v_category_id,
        'subcategory_ids', v_sub_ids,
        'seller_id', p_data->>'vendedor_id',
        'location', p_data->>'direccion',
        'whatsapp', p_data->>'whatsapp',
        'instagram', p_data->>'instagram',
        'facebook', p_data->>'facebook',
        'tiktok', p_data->>'tiktok',
        'resources_count', v_count,
        'subscription_status', coalesce(p_data->>'estado', 'trial')
    ));
    v_business_id := v_created->>'id';
    v_type := v_created->>'type';

    -- Perfil
    UPDATE public.businesses b SET
        description  = coalesce(nullif(trim(p_data->>'descripcion'), ''), b.description),
        logo_url     = coalesce(nullif(p_data->>'logo', ''), b.logo_url),
        banner_url   = coalesce(nullif(p_data->>'portada', ''), b.banner_url),
        hours        = CASE WHEN jsonb_typeof(p_data->'horarios') = 'object' THEN (p_data->'horarios')::text ELSE b.hours END,
        latitude     = coalesce(nullif(p_data->>'latitud', '')::double precision, b.latitude),
        longitude    = coalesce(nullif(p_data->>'longitud', '')::double precision, b.longitude),
        price_per_hour = coalesce(nullif(p_data->>'precio_hora', '')::numeric, b.price_per_hour),
        price_per_day  = coalesce(nullif(p_data->>'precio_dia', '')::numeric, b.price_per_day),
        pricing_model  = CASE WHEN nullif(p_data->>'precio_dia', '') IS NOT NULL
                               AND nullif(p_data->>'precio_hora', '') IS NULL THEN 'daily' ELSE b.pricing_model END,
        max_capacity   = coalesce(nullif(p_data->>'capacidad', '')::integer, b.max_capacity),
        capacity_limit = coalesce(nullif(p_data->>'capacidad', '')::integer, b.capacity_limit),
        metadata = b.metadata
            || CASE WHEN coalesce((p_data->>'simulacion')::boolean, false)
                    THEN '{"simulacion": true}'::jsonb ELSE '{}'::jsonb END
            || jsonb_build_object('cargado_por_script', now())
    WHERE b.id = v_business_id;

    -- Profesionales: renombra "Especialista N" en el orden del archivo
    IF v_type = 'service' THEN
        i := 0;
        FOR v_spec_id IN
            SELECT s.id FROM public.specialists s WHERE s.business_id = v_business_id
            ORDER BY s.created_at, s.name
        LOOP
            v_item := v_pros->i;
            IF v_item IS NOT NULL THEN
                UPDATE public.specialists SET
                    name = coalesce(v_item->>'nombre', v_item #>> '{}'),
                    role = coalesce(nullif(v_item->>'rol', ''), role)
                WHERE id = v_spec_id;
            END IF;
            i := i + 1;
        END LOOP;

        FOR v_item IN SELECT * FROM jsonb_array_elements(v_services) LOOP
            INSERT INTO public.services (business_id, name, duration, price, category, description)
            VALUES (
                v_business_id,
                v_item->>'nombre',
                coalesce(nullif(v_item->>'duracion', '')::integer, 30),
                coalesce(nullif(v_item->>'precio', '')::numeric, 0),
                coalesce(nullif(v_item->>'categoria', ''), 'General'),
                nullif(v_item->>'descripcion', '')
            );
        END LOOP;
    ELSIF v_type = 'sport' THEN
        -- Canchas: nombre y precio (courts + su recurso sincronizado)
        i := 0;
        FOR v_court_id IN
            SELECT c.id FROM public.courts c WHERE c.business_id = v_business_id
            ORDER BY (regexp_replace(c.name, '\D', '', 'g'))::integer NULLS LAST
        LOOP
            v_item := v_courts->i;
            IF v_item IS NOT NULL THEN
                UPDATE public.courts SET
                    name  = coalesce(nullif(v_item->>'nombre', ''), name),
                    price = coalesce(nullif(v_item->>'precio', '')::numeric, price),
                    sport = coalesce(nullif(public.seed_slugify(v_item->>'deporte'), ''), sport)
                WHERE id = v_court_id;
                UPDATE public.resources r SET
                    name = c.name, base_price = c.price, sport = c.sport, updated_at = now()
                FROM public.courts c
                WHERE c.id = v_court_id AND r.metadata->>'court_id' = v_court_id;
            END IF;
            i := i + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'id', v_business_id,
        'nombre', v_name,
        'slug', v_slug,
        'link', 'https://' || v_slug || '.turnitoslr.com',
        'email', v_email,
        'password', v_password,
        'tipo', v_type
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_simulated_businesses()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ids   text[];
    v_users uuid[];
BEGIN
    SELECT array_agg(id), array_agg(auth_id) FILTER (WHERE auth_id IS NOT NULL)
    INTO v_ids, v_users
    FROM public.businesses
    WHERE metadata->>'simulacion' = 'true';

    IF v_ids IS NULL THEN
        RETURN 0;
    END IF;

    -- Las tablas sin borrado en cascada
    DELETE FROM public.subscription_payments WHERE business_id::text = ANY (v_ids);
    DELETE FROM public.seller_commissions WHERE business_id::text = ANY (v_ids);
    DELETE FROM public.businesses WHERE id = ANY (v_ids);
    DELETE FROM auth.users WHERE id = ANY (coalesce(v_users, '{}'));

    RETURN array_length(v_ids, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_seed_business(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_simulated_businesses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_seed_business(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_simulated_businesses() TO service_role;
