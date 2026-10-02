-- Seguridad fase 4: los datos de cobro solo los cambia el superadmin o el vendedor del negocio.
-- El dueño puede seguir guardando su negocio y sus recursos; si su navegador manda
-- campos de cobro, se conservan los valores anteriores (sin error, para no romper el portal).

-- Precio mensual según rubro y cantidad de espacios (misma fórmula que usaba la app).
-- Para cambiar precios, se modifica solo esta función.
CREATE OR REPLACE FUNCTION public.calculate_subscription_price(p_business_type text, p_spaces integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN p_business_type = 'service' THEN
            CASE WHEN coalesce(p_spaces, 1) <= 1 THEN 18000
                 ELSE 36000 + greatest(0, p_spaces - 3) * 10000 END
        WHEN p_business_type IN ('sport', 'courts') THEN
            CASE WHEN coalesce(p_spaces, 1) <= 3 THEN greatest(1, coalesce(p_spaces, 1)) * 20000
                 WHEN p_spaces <= 5 THEN p_spaces * 17000
                 ELSE p_spaces * 15000 END
        WHEN p_business_type IN ('venue', 'alquiler', 'rental') THEN 15000
        ELSE 18000
    END::numeric;
$$;

-- ¿El usuario actual puede administrar el cobro de este negocio? (superadmin o su vendedor)
CREATE OR REPLACE FUNCTION public.can_manage_billing(p_business_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.is_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = p_business_id
              AND b.seller_id IS NOT NULL
              AND b.seller_id = public.current_seller_id()
        );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_billing(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_billing(text) TO authenticated;

-- businesses: el dueño no puede cambiar campos de cobro ni de propiedad
CREATE OR REPLACE FUNCTION public.protect_business_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Procesos internos (sin usuario) y quien gestiona el cobro: sin restricción
    IF auth.uid() IS NULL OR public.can_manage_billing(OLD.id) THEN
        RETURN NEW;
    END IF;

    NEW.subscription_status     := OLD.subscription_status;
    NEW.subscription_plan_id    := OLD.subscription_plan_id;
    NEW.trial_start_date        := OLD.trial_start_date;
    NEW.trial_end_date          := OLD.trial_end_date;
    NEW.subscription_start_date := OLD.subscription_start_date;
    NEW.payment_cycle           := OLD.payment_cycle;
    NEW.seller_id               := OLD.seller_id;
    NEW.auth_id                 := OLD.auth_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_business_billing_fields ON public.businesses;
CREATE TRIGGER protect_business_billing_fields
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.protect_business_billing_fields();

-- subscriptions: el precio lo calcula la base; el dueño no toca estado ni fechas de cobro
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_type text;
BEGIN
    IF auth.uid() IS NULL OR public.can_manage_billing(NEW.business_id) THEN
        RETURN NEW;
    END IF;

    SELECT type INTO v_type FROM public.businesses WHERE id = NEW.business_id;
    NEW.monthly_price := public.calculate_subscription_price(v_type, NEW.spaces_included);

    IF TG_OP = 'UPDATE' THEN
        NEW.business_id       := OLD.business_id;
        NEW.status            := OLD.status;
        NEW.billing_start     := OLD.billing_start;
        NEW.billing_end       := OLD.billing_end;
        NEW.next_billing_date := OLD.next_billing_date;
        NEW.currency          := OLD.currency;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_subscription_fields ON public.subscriptions;
CREATE TRIGGER protect_subscription_fields
    BEFORE INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_fields();

REVOKE EXECUTE ON FUNCTION public.protect_business_billing_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_subscription_fields()    FROM PUBLIC, anon, authenticated;

-- Pagos y comisiones: solo superadmin o el vendedor del negocio (ya cubierto por RLS),
-- y el dueño solo puede leer sus pagos (payments_read).
