-- Seguridad etapa 1b: cierre de la tabla de negocios.
-- APLICAR RECIÉN CUANDO LA APP NUEVA ESTÉ EN PRODUCCIÓN (la vieja lee la tabla entera).
-- Desde acá el público lee los negocios solo desde businesses_public. La fila completa
-- (email del dueño, cupones, datos de la cuenta) solo la ven el dueño, su vendedor o el SuperAdmin.
-- La columna vieja password_hash (vacía) queda cerrada junto con la tabla.

ALTER POLICY businesses_read ON public.businesses
    TO authenticated
    USING (public.can_manage_business(id));

REVOKE SELECT ON public.businesses FROM anon;
