-- Seguridad etapa 1 (parte compatible con la app actual)
-- 1. Fotos: cualquiera con sesión podía borrar o reemplazar fotos de otros negocios.
--    Ahora solo quien subió el archivo o el SuperAdmin.
-- 2. Cupones: el uso se contaba con una función pública que cualquiera podía llamar
--    sin reservar. Ahora lo suma la base al crear la reserva con ese cupón.
-- 3. La función vieja set_business_password queda sin acceso.

-- 1. Storage (ALTER en lugar de DROP: las políticas duplicadas de INSERT quedan, son inofensivas)
ALTER POLICY "Authenticated users can update their uploads" ON storage.objects TO authenticated
    USING (bucket_id = 'business-images' AND (owner = auth.uid() OR public.is_super_admin()))
    WITH CHECK (bucket_id = 'business-images' AND (owner = auth.uid() OR public.is_super_admin()));
ALTER POLICY "Public Update" ON storage.objects TO authenticated
    USING (bucket_id = 'business-images' AND (owner = auth.uid() OR public.is_super_admin()))
    WITH CHECK (bucket_id = 'business-images' AND (owner = auth.uid() OR public.is_super_admin()));
ALTER POLICY "Authenticated users can delete their uploads" ON storage.objects TO authenticated
    USING (bucket_id = 'business-images' AND (owner = auth.uid() OR public.is_super_admin()));
ALTER POLICY "Public Delete" ON storage.objects TO authenticated
    USING (bucket_id = 'business-images' AND (owner = auth.uid() OR public.is_super_admin()));

-- 2. Cupones
CREATE OR REPLACE FUNCTION public.count_booking_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_code text := upper(trim(coalesce(NEW.metadata->>'coupon_code', '')));
BEGIN
    IF v_code = '' THEN
        RETURN NEW;
    END IF;

    UPDATE public.businesses b
    SET metadata = jsonb_set(
        b.metadata,
        '{coupons}',
        (
            SELECT coalesce(jsonb_agg(
                CASE
                    WHEN upper(trim(c->>'code')) = v_code
                    THEN c || jsonb_build_object('used_count', coalesce((c->>'used_count')::int, 0) + 1)
                    ELSE c
                END
            ), '[]'::jsonb)
            FROM jsonb_array_elements(b.metadata->'coupons') c
        )
    )
    WHERE b.id = NEW.business_id
      AND jsonb_typeof(b.metadata->'coupons') = 'array';

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.count_booking_coupon_usage() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trigger_30_count_booking_coupon_usage
    AFTER INSERT ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.count_booking_coupon_usage();

-- La app vieja la sigue llamando después de reservar; queda sin efecto para no contar doble
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_business_id text, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    RETURN;
END;
$$;

-- 3. Función vieja de contraseña en businesses: nadie puede llamarla.
--    La columna password_hash (vacía) se borra en la etapa 1b, junto con el cierre de columnas privadas.
REVOKE EXECUTE ON FUNCTION public.set_business_password(text, text) FROM PUBLIC, anon, authenticated;
