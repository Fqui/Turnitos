-- Solo el SuperAdmin o un vendedor (para sí mismo) pueden crear negocios.
-- Antes cualquier usuario logueado podía crear un negocio a su nombre (auth_id = auth.uid()).
-- El alta normal pasa por la edge function admin-accounts con service_role, que no usa esta política.
ALTER POLICY businesses_insert ON public.businesses
    WITH CHECK (
        public.is_super_admin()
        OR (seller_id IS NOT NULL AND seller_id = public.current_seller_id())
    );
