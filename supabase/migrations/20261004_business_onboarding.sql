-- Alta de negocios en un solo paso desde el servidor.
--
-- 1. pick_subscription_plan(): elige el plan según tipo y cantidad de espacios
--    (antes se tomaba el primer plan de la tabla y todos quedaban en "1 Cancha").
-- 2. Precios de subscription_plans alineados con calculate_subscription_price().
-- 3. Corrige el plan de los negocios existentes.
-- 4. admin_create_business(): crea negocio, subcategorías, suscripción y
--    profesionales/canchas en una sola transacción. Solo la llama la edge
--    function admin-accounts (service_role), después de crear la cuenta.

-- 1. Plan según tipo y cantidad ------------------------------------------------
CREATE OR REPLACE FUNCTION public.pick_subscription_plan(p_business_type text, p_spaces integer)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    WITH t AS (
        SELECT CASE
                   WHEN p_business_type IN ('venue', 'rental') THEN 'alquiler'
                   WHEN p_business_type = 'courts' THEN 'sport'
                   ELSE p_business_type
               END AS business_type,
               greatest(1, coalesce(p_spaces, 1)) AS spaces
    )
    SELECT p.id
    FROM public.subscription_plans p, t
    WHERE p.business_type = t.business_type
      AND p.name NOT ILIKE 'Por %'
    ORDER BY
        (p.spaces_included = t.spaces) DESC,      -- exacto
        (p.spaces_included >= t.spaces) DESC,     -- el más chico que alcanza
        CASE WHEN p.spaces_included >= t.spaces THEN p.spaces_included END ASC,
        p.spaces_included DESC                    -- si no alcanza ninguno, el más grande
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.pick_subscription_plan(text, integer) TO authenticated, service_role;

-- 2. Precios vigentes (2026-10-02) en la tabla de planes ------------------------
UPDATE public.subscription_plans
SET price_monthly = public.calculate_subscription_price(business_type, spaces_included)
WHERE name NOT ILIKE 'Por %';

UPDATE public.subscription_plans
SET price_monthly = 10000
WHERE business_type = 'service' AND name ILIKE 'Por %';

-- 3. Plan correcto para los negocios existentes --------------------------------
UPDATE public.businesses b
SET subscription_plan_id = public.pick_subscription_plan(
        b.type,
        coalesce((SELECT s.spaces_included FROM public.subscriptions s WHERE s.business_id = b.id::text LIMIT 1), b.capacity, 1)
    );

-- 4. Alta completa en una transacción -------------------------------------------
-- p_data: name, slug, email, category_id, subcategory_ids[], seller_id, location,
--         whatsapp, instagram, facebook, tiktok, resources_count, subscription_status
CREATE OR REPLACE FUNCTION public.admin_create_business(p_auth_id uuid, p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
-- public/extensions porque los triggers de businesses (ubicación) usan nombres sin esquema
SET search_path = public, extensions
AS $$
DECLARE
    v_type        text;
    v_category_id uuid := nullif(p_data->>'category_id', '')::uuid;
    v_count       integer := greatest(1, coalesce(nullif(p_data->>'resources_count', '')::integer, 1));
    v_status      text := coalesce(nullif(p_data->>'subscription_status', ''), 'trial');
    v_sport       text := 'padel';
    v_business    public.businesses%ROWTYPE;
    i             integer;
BEGIN
    IF coalesce(trim(p_data->>'name'), '') = '' THEN
        RAISE EXCEPTION 'El nombre del negocio es obligatorio';
    END IF;

    SELECT c.business_type INTO v_type FROM public.categories c WHERE c.id = v_category_id;
    IF v_type IS NULL THEN
        RAISE EXCEPTION 'Elegí una categoría válida';
    END IF;
    IF v_type = 'venue' THEN v_type := 'alquiler'; END IF;
    IF v_type = 'alquiler' THEN v_count := 1; END IF;
    IF v_status NOT IN ('trial', 'active', 'inactive') THEN v_status := 'trial'; END IF;

    INSERT INTO public.businesses (
        name, slug, email, auth_id, type, category_id, seller_id,
        location, whatsapp, instagram, facebook, tiktok,
        subscription_plan_id, subscription_status, capacity, password_changed
    ) VALUES (
        trim(p_data->>'name'),
        p_data->>'slug',
        lower(p_data->>'email'),
        p_auth_id,
        v_type,
        v_category_id,
        nullif(p_data->>'seller_id', ''),
        nullif(trim(p_data->>'location'), ''),
        nullif(trim(p_data->>'whatsapp'), ''),
        nullif(trim(p_data->>'instagram'), ''),
        nullif(trim(p_data->>'facebook'), ''),
        nullif(trim(p_data->>'tiktok'), ''),
        public.pick_subscription_plan(v_type, v_count),
        v_status,
        v_count,
        false
    )
    RETURNING * INTO v_business;

    INSERT INTO public.business_subcategories (business_id, subcategory_id)
    SELECT v_business.id::text, s.id
    FROM public.subcategories s
    WHERE s.id::text IN (SELECT jsonb_array_elements_text(coalesce(p_data->'subcategory_ids', '[]'::jsonb)));

    -- El primer cobro coincide con el fin de la prueba
    INSERT INTO public.subscriptions (
        business_id, plan_name, spaces_included, spaces_used, monthly_price,
        status, billing_start, next_billing_date
    ) VALUES (
        v_business.id::text,
        CASE v_type
            WHEN 'service' THEN CASE WHEN v_count > 1 THEN 'Servicios - Equipo' ELSE 'Servicios - Individual' END
            WHEN 'sport' THEN 'Canchas'
            ELSE 'Plan Espacios'
        END,
        v_count,
        0,
        public.calculate_subscription_price(v_type, v_count),
        'active',
        current_date,
        coalesce(v_business.trial_end_date::date, (current_date + interval '1 month')::date)
    );

    IF v_type = 'service' THEN
        FOR i IN 1..v_count LOOP
            -- Los profesionales viven solo en specialists (resources no admite type 'service')
            INSERT INTO public.specialists (business_id, name, role)
            VALUES (v_business.id::text, 'Especialista ' || i, 'General');
        END LOOP;
    ELSIF v_type = 'sport' THEN
        SELECT CASE
                   WHEN bool_or(s.slug ILIKE '%futbol%' OR s.name ILIKE '%fútbol%' OR s.name ILIKE '%futbol%') THEN 'futbol'
                   WHEN bool_or(s.slug ILIKE '%tenis%' OR s.name ILIKE '%tenis%') THEN 'tenis'
                   ELSE 'padel'
               END
        INTO v_sport
        FROM public.subcategories s
        WHERE s.id::text IN (SELECT jsonb_array_elements_text(coalesce(p_data->'subcategory_ids', '[]'::jsonb)));

        -- El trigger trigger_sync_court crea el recurso de cada cancha.
        -- Precio 0: el dueño lo completa y el perfil no se publica hasta tenerlo.
        FOR i IN 1..v_count LOOP
            INSERT INTO public.courts (id, business_id, name, sport, price)
            VALUES (gen_random_uuid()::text, v_business.id::text, 'Cancha ' || i, coalesce(v_sport, 'padel'), 0);
        END LOOP;
    END IF;

    RETURN jsonb_build_object('id', v_business.id, 'slug', v_business.slug, 'email', v_business.email, 'type', v_type);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_business(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_business(uuid, jsonb) TO service_role;
