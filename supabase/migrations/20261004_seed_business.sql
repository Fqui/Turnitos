-- Carga masiva de negocios (script scripts/negocios/cargar-negocios.mjs).
--
-- admin_seed_business(p_data): crea la cuenta del dueño, llama a
--   admin_create_business() (misma alta que los formularios) y completa el
--   perfil con admin_apply_business_profile() (20261004_seed_business_profile).
--   Todo en una transacción: si algo falla no queda nada a medias.
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
    v_count        integer;
    v_created      jsonb;
    v_business_id  text;
    v_type         text;
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

    v_count := greatest(1, jsonb_array_length(coalesce(p_data->'profesionales', '[]')),
                        jsonb_array_length(coalesce(p_data->'canchas', '[]')),
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

    -- Perfil completo (20261004_seed_business_profile.sql)
    PERFORM public.admin_apply_business_profile(v_business_id, p_data);

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
