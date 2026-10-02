-- Seguridad fase 3: políticas RLS reales.
-- Requiere aplicada antes: 20261002_secure_bookings_analytics.sql y 20261002_public_booking_rpcs.sql
--
-- Roles:
--   visitante (anon)  → lee catálogo público, crea reservas 'pending'
--   dueño             → businesses.auth_id = auth.uid()
--   vendedor          → sellers.auth_id = auth.uid() y businesses.seller_id = sellers.id
--   superadmin        → super_admins.auth_id = auth.uid()

-- ---------------------------------------------------------------------------
-- 1. Funciones de ayuda (SECURITY DEFINER para no depender del RLS que evalúan)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_seller_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT id FROM public.sellers WHERE auth_id = auth.uid() AND is_active LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT auth.uid() IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = p_business_id
              AND (
                  b.auth_id = auth.uid()
                  OR (b.seller_id IS NOT NULL AND b.seller_id = public.current_seller_id())
              )
        )
        OR public.is_super_admin()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.current_seller_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_business(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_seller_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_business(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Borrar TODAS las políticas actuales de las tablas de la app
--    (muchas son "Public access ... USING (true)")
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'amenities', 'bookings', 'business_amenities', 'business_subcategories',
              'businesses', 'categories', 'courts', 'customers', 'promotions',
              'push_subscriptions', 'resources', 'seller_commissions', 'sellers',
              'service_specialists', 'services', 'specialists', 'subcategories',
              'subscription_payments', 'subscription_plans', 'subscriptions'
          )
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END;
$$;

-- RLS activado en todas
ALTER TABLE public.amenities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_amenities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subcategories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_specialists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialists             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions           ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Catálogo global: lectura pública, escritura solo superadmin
-- ---------------------------------------------------------------------------
CREATE POLICY "catalog_read" ON public.categories         FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_read" ON public.subcategories      FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_read" ON public.amenities          FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_read" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_admin_write" ON public.categories         FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "catalog_admin_write" ON public.subcategories      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "catalog_admin_write" ON public.amenities          FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "catalog_admin_write" ON public.subscription_plans FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 4. Negocios
-- ---------------------------------------------------------------------------
CREATE POLICY "businesses_read" ON public.businesses
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "businesses_insert" ON public.businesses
    FOR INSERT TO authenticated
    WITH CHECK (
        auth_id = auth.uid()
        OR public.is_super_admin()
        OR (seller_id IS NOT NULL AND seller_id = public.current_seller_id())
    );

CREATE POLICY "businesses_update" ON public.businesses
    FOR UPDATE TO authenticated
    USING (public.can_manage_business(id))
    WITH CHECK (public.can_manage_business(id));

CREATE POLICY "businesses_delete" ON public.businesses
    FOR DELETE TO authenticated
    USING (public.is_super_admin() OR (seller_id IS NOT NULL AND seller_id = public.current_seller_id()));

-- ---------------------------------------------------------------------------
-- 5. Datos públicos de cada negocio: lectura pública, escritura de quien lo gestiona
-- ---------------------------------------------------------------------------
CREATE POLICY "public_read" ON public.services               FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON public.specialists            FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON public.courts                 FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON public.resources              FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON public.business_subcategories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON public.business_amenities     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON public.promotions             FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON public.service_specialists    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "manager_write" ON public.services               FOR ALL TO authenticated USING (public.can_manage_business(business_id)) WITH CHECK (public.can_manage_business(business_id));
CREATE POLICY "manager_write" ON public.specialists            FOR ALL TO authenticated USING (public.can_manage_business(business_id)) WITH CHECK (public.can_manage_business(business_id));
CREATE POLICY "manager_write" ON public.courts                 FOR ALL TO authenticated USING (public.can_manage_business(business_id)) WITH CHECK (public.can_manage_business(business_id));
CREATE POLICY "manager_write" ON public.resources              FOR ALL TO authenticated USING (public.can_manage_business(business_id)) WITH CHECK (public.can_manage_business(business_id));
CREATE POLICY "manager_write" ON public.business_subcategories FOR ALL TO authenticated USING (public.can_manage_business(business_id)) WITH CHECK (public.can_manage_business(business_id));
CREATE POLICY "manager_write" ON public.business_amenities     FOR ALL TO authenticated USING (public.can_manage_business(business_id)) WITH CHECK (public.can_manage_business(business_id));

-- Promociones generales (sin negocio) solo las maneja el superadmin
CREATE POLICY "manager_write" ON public.promotions
    FOR ALL TO authenticated
    USING (public.is_super_admin() OR (business_id IS NOT NULL AND public.can_manage_business(business_id)))
    WITH CHECK (public.is_super_admin() OR (business_id IS NOT NULL AND public.can_manage_business(business_id)));

CREATE POLICY "manager_write" ON public.service_specialists
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND public.can_manage_business(s.business_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND public.can_manage_business(s.business_id)));

-- ---------------------------------------------------------------------------
-- 6. Reservas: el público solo crea reservas pendientes; el resto, quien gestiona el negocio.
--    La disponibilidad pública se lee de la vista bookings_public.
-- ---------------------------------------------------------------------------
CREATE POLICY "bookings_public_insert" ON public.bookings
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        coalesce(status, 'pending') = 'pending'
        AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id)
    );

CREATE POLICY "bookings_manager_all" ON public.bookings
    FOR ALL TO authenticated
    USING (public.can_manage_business(business_id))
    WITH CHECK (public.can_manage_business(business_id));

-- Clientes (los crea el trigger de reservas)
CREATE POLICY "customers_manager_all" ON public.customers
    FOR ALL TO authenticated
    USING (public.can_manage_business(business_id))
    WITH CHECK (public.can_manage_business(business_id));

-- Notificaciones push del negocio
CREATE POLICY "push_manager_all" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (public.can_manage_business(business_id))
    WITH CHECK (public.can_manage_business(business_id));

-- ---------------------------------------------------------------------------
-- 7. Suscripciones y pagos
-- ---------------------------------------------------------------------------
CREATE POLICY "subscriptions_manager_all" ON public.subscriptions
    FOR ALL TO authenticated
    USING (public.can_manage_business(business_id))
    WITH CHECK (public.can_manage_business(business_id));

CREATE POLICY "payments_read" ON public.subscription_payments
    FOR SELECT TO authenticated
    USING (public.can_manage_business(business_id));

CREATE POLICY "payments_write" ON public.subscription_payments
    FOR ALL TO authenticated
    USING (
        public.is_super_admin()
        OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.seller_id = public.current_seller_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.seller_id = public.current_seller_id())
    );

-- ---------------------------------------------------------------------------
-- 8. Vendedores y comisiones
-- ---------------------------------------------------------------------------
CREATE POLICY "sellers_read" ON public.sellers
    FOR SELECT TO authenticated
    USING (auth_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "sellers_update" ON public.sellers
    FOR UPDATE TO authenticated
    USING (auth_id = auth.uid() OR public.is_super_admin())
    WITH CHECK (auth_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "sellers_admin_write" ON public.sellers
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "commissions_read" ON public.seller_commissions
    FOR SELECT TO authenticated
    USING (seller_id = public.current_seller_id() OR public.is_super_admin());

CREATE POLICY "commissions_write" ON public.seller_commissions
    FOR ALL TO authenticated
    USING (public.is_super_admin() OR seller_id = public.current_seller_id())
    WITH CHECK (public.is_super_admin() OR seller_id = public.current_seller_id());

-- Superadmins: además de su propia fila, ven a los demás superadmins
CREATE POLICY "super_admins_read_all" ON public.super_admins
    FOR SELECT TO authenticated
    USING (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 9. Triggers y funciones que el público dispara al reservar:
--    corren con permisos propios para seguir viendo/escribiendo lo que necesitan.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.sync_booking_to_customers()        SECURITY DEFINER;
ALTER FUNCTION public.sync_booking_to_customers()        SET search_path = public;
ALTER FUNCTION public.validate_buffer_time()             SECURITY DEFINER;
ALTER FUNCTION public.validate_buffer_time()             SET search_path = public;
ALTER FUNCTION public.sync_court_to_resource()           SECURITY DEFINER;
ALTER FUNCTION public.sync_court_to_resource()           SET search_path = public;
ALTER FUNCTION public.update_subscription_spaces_used()  SECURITY DEFINER;
ALTER FUNCTION public.update_subscription_spaces_used()  SET search_path = public;
ALTER FUNCTION public.validate_space_limit()             SECURITY DEFINER;
ALTER FUNCTION public.validate_space_limit()             SET search_path = public;

ALTER FUNCTION public.check_business_availability(text, timestamptz, timestamptz, text) SECURITY DEFINER;
ALTER FUNCTION public.check_business_availability(text, timestamptz, timestamptz, text) SET search_path = public;
ALTER FUNCTION public.check_resource_availability(uuid, timestamptz, timestamptz, uuid) SECURITY DEFINER;
ALTER FUNCTION public.check_resource_availability(uuid, timestamptz, timestamptz, uuid) SET search_path = public;
ALTER FUNCTION public.check_specialist_availability(uuid, timestamptz, timestamptz, uuid) SECURITY DEFINER;
ALTER FUNCTION public.check_specialist_availability(uuid, timestamptz, timestamptz, uuid) SET search_path = public;
ALTER FUNCTION public.can_reschedule_booking(uuid) SECURITY DEFINER;
ALTER FUNCTION public.can_reschedule_booking(uuid) SET search_path = public;

-- Las funciones de trigger no se llaman por la API
REVOKE EXECUTE ON FUNCTION public.sync_booking_to_analytics()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_booking_to_customers()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_buffer_time()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_court_to_resource()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_subscription_spaces_used() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_space_limit()            FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. upsert_specialists: solo quien gestiona el negocio
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_specialists(p_business_id text, p_specialists jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_specialist JSONB; v_id TEXT; v_name TEXT; v_role TEXT; v_avatar_url TEXT; v_result JSONB := '[]'::JSONB;
BEGIN
  IF NOT public.can_manage_business(p_business_id) THEN
    RAISE EXCEPTION 'No autorizado para modificar este negocio';
  END IF;

  FOR v_specialist IN SELECT * FROM jsonb_array_elements(p_specialists) LOOP
    v_id := v_specialist->>'id'; v_name := v_specialist->>'name';
    v_role := COALESCE(v_specialist->>'role', 'General'); v_avatar_url := v_specialist->>'avatar_url';
    IF v_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      UPDATE specialists SET name=v_name, role=v_role, avatar_url=v_avatar_url WHERE id=v_id AND business_id=p_business_id;
      IF NOT FOUND THEN
        INSERT INTO specialists (id,business_id,name,role,avatar_url) VALUES (v_id,p_business_id,v_name,v_role,v_avatar_url)
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, avatar_url=EXCLUDED.avatar_url
        WHERE specialists.business_id = p_business_id;
      END IF;
    ELSE
      v_id := gen_random_uuid()::text;
      INSERT INTO specialists (id,business_id,name,role,avatar_url) VALUES (v_id,p_business_id,v_name,v_role,v_avatar_url) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  SELECT jsonb_agg(jsonb_build_object('id',id,'business_id',business_id,'name',name,'role',role,'avatar_url',avatar_url))
  INTO v_result FROM specialists WHERE business_id=p_business_id;
  RETURN COALESCE(v_result,'[]'::JSONB);
END; $function$;

REVOKE EXECUTE ON FUNCTION public.upsert_specialists(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_specialists(text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. Funciones del sistema de contraseñas viejo (la app usa Supabase Auth):
--     nadie las puede llamar desde la API.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.set_business_password(text, text)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.change_business_password(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.login_business(text, text)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.login_seller(text, text)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.login_super_admin(text, text)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                          FROM PUBLIC, anon, authenticated;
