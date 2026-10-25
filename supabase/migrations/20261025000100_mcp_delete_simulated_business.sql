-- MCP de TurnitosLR (supabase/functions/mcp): borrar un solo negocio de simulación.
--
-- admin_delete_simulated_business(p_slug): como admin_delete_simulated_businesses()
--   (20261004_seed_business.sql) pero para un negocio. Se niega si el negocio no tiene
--   metadata.simulacion = true. Devuelve el id borrado. Los archivos del storage los
--   borra la función mcp.
--
-- Solo la puede ejecutar service_role.

CREATE OR REPLACE FUNCTION public.admin_delete_simulated_business(p_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id    text;
    v_user  uuid;
    v_sim   boolean;
BEGIN
    SELECT id, auth_id, coalesce(metadata->>'simulacion' = 'true', false)
    INTO v_id, v_user, v_sim
    FROM public.businesses
    WHERE slug = p_slug
    FOR UPDATE;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'No existe el negocio %', p_slug;
    END IF;
    IF NOT v_sim THEN
        RAISE EXCEPTION 'El negocio % no es de simulación: no se borra', p_slug;
    END IF;

    -- Las tablas sin borrado en cascada
    DELETE FROM public.subscription_payments WHERE business_id::text = v_id;
    DELETE FROM public.seller_commissions WHERE business_id::text = v_id;
    DELETE FROM public.businesses WHERE id = v_id;
    -- La cuenta solo si no la usa otro negocio
    IF v_user IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE auth_id = v_user) THEN
        DELETE FROM auth.users WHERE id = v_user;
    END IF;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_simulated_business(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_simulated_business(text) TO service_role;
