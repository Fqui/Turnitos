-- Seguridad fase 1: bloquear bookings_analytics y base para políticas de superadmin

-- Helper: ¿el usuario autenticado es superadmin activo?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.super_admins
        WHERE auth_id = auth.uid() AND is_active
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- super_admins: cada superadmin puede leer su propia fila (necesario para el login)
DROP POLICY IF EXISTS "Super admins can read own row" ON public.super_admins;
CREATE POLICY "Super admins can read own row" ON public.super_admins
    FOR SELECT TO authenticated
    USING (auth_id = auth.uid());

-- bookings_analytics: sin acceso público; solo superadmins pueden leer
ALTER TABLE public.bookings_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read analytics" ON public.bookings_analytics;
CREATE POLICY "Super admins can read analytics" ON public.bookings_analytics
    FOR SELECT TO authenticated
    USING (public.is_super_admin());

-- El trigger escribe con permisos del dueño de la función, no del visitante
ALTER FUNCTION public.sync_booking_to_analytics() SECURITY DEFINER;
ALTER FUNCTION public.sync_booking_to_analytics() SET search_path = public;

-- La vista resumen respeta el RLS de la tabla base
ALTER VIEW public.v_bookings_analytics_summary SET (security_invoker = true);
