-- Pedidos de alta que dejan los negocios desde /negocios.
-- Cualquiera puede enviar uno; solo los superadmins los ven y les cambian el estado.

CREATE TABLE IF NOT EXISTS public.business_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 2 AND 120),
    category text NOT NULL CHECK (category IN ('deportes', 'servicios', 'salud', 'alquileres', 'otro')),
    contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 2 AND 120),
    phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 30),
    city text CHECK (city IS NULL OR char_length(city) <= 80),
    message text CHECK (message IS NULL OR char_length(message) <= 1000),
    status text NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'alta', 'descartado')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_public_insert" ON public.business_leads;
CREATE POLICY "leads_public_insert" ON public.business_leads
    FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'nuevo');

DROP POLICY IF EXISTS "leads_admin_read" ON public.business_leads;
CREATE POLICY "leads_admin_read" ON public.business_leads
    FOR SELECT TO authenticated
    USING (public.is_super_admin());

DROP POLICY IF EXISTS "leads_admin_update" ON public.business_leads;
CREATE POLICY "leads_admin_update" ON public.business_leads
    FOR UPDATE TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "leads_admin_delete" ON public.business_leads;
CREATE POLICY "leads_admin_delete" ON public.business_leads
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

CREATE INDEX IF NOT EXISTS business_leads_created_at_idx ON public.business_leads (created_at DESC);
