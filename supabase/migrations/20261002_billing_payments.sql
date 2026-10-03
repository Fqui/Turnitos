-- Cobros manuales: registrar pagos, correr vencimientos y calcular comisiones en el servidor.
--   Estado del negocio: businesses.subscription_status (trial / active / inactive = pausado).
--   "Vencido" se calcula en la app: fecha de vencimiento + 5 días de gracia sin pago.
--   Vencimiento: subscriptions.next_billing_date (o trial_end_date mientras está en prueba).

-- 1. Datos extra del pago
ALTER TABLE public.subscription_payments
    ALTER COLUMN subscription_plan_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS method text,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS registered_by uuid;

-- 2. Negocios nuevos arrancan en prueba de 14 días
CREATE OR REPLACE FUNCTION public.set_business_trial_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.subscription_status := coalesce(NEW.subscription_status, 'trial');
    IF NEW.subscription_status = 'trial' THEN
        NEW.trial_start_date := coalesce(NEW.trial_start_date, now());
        NEW.trial_end_date := coalesce(NEW.trial_end_date, NEW.trial_start_date + interval '14 days');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_business_trial_defaults ON public.businesses;
CREATE TRIGGER set_business_trial_defaults
    BEFORE INSERT ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.set_business_trial_defaults();

REVOKE EXECUTE ON FUNCTION public.set_business_trial_defaults() FROM PUBLIC, anon, authenticated;

-- Negocios en prueba existentes sin fecha de fin
UPDATE public.businesses
SET trial_start_date = coalesce(trial_start_date, created_at),
    trial_end_date = coalesce(trial_end_date, coalesce(trial_start_date, created_at) + interval '14 days')
WHERE subscription_status = 'trial' AND trial_end_date IS NULL;

-- 3. Registrar un pago (superadmin o vendedor del negocio)
CREATE OR REPLACE FUNCTION public.register_subscription_payment(
    p_business_id text,
    p_months integer DEFAULT 1,
    p_amount numeric DEFAULT NULL,
    p_method text DEFAULT 'transferencia',
    p_payment_date date DEFAULT current_date,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_business public.businesses%ROWTYPE;
    v_sub public.subscriptions%ROWTYPE;
    v_months integer := greatest(1, least(12, coalesce(p_months, 1)));
    v_monthly numeric;
    v_amount numeric;
    v_period_start date;
    v_period_end date;
    v_payment_id text;
    v_sub_month integer;
    v_rate numeric := 0;
    v_bonus numeric := 0;
    v_active_clients integer := 0;
    v_commission_id text;
BEGIN
    IF NOT public.can_manage_billing(p_business_id) THEN
        RAISE EXCEPTION 'No autorizado para registrar pagos de este negocio';
    END IF;

    SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Negocio no encontrado';
    END IF;

    SELECT * INTO v_sub FROM public.subscriptions WHERE business_id = p_business_id LIMIT 1 FOR UPDATE;

    v_monthly := coalesce(v_sub.monthly_price,
                          public.calculate_subscription_price(v_business.type, coalesce(v_sub.spaces_included, 1)));
    v_amount := coalesce(p_amount, v_monthly * v_months);
    IF v_amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0';
    END IF;

    -- El período cubierto arranca en el vencimiento pendiente (si pagó tarde, cubre desde ahí)
    -- o, si nunca pagó, en la fecha del pago.
    v_period_start := coalesce(v_sub.next_billing_date, p_payment_date);
    IF v_business.subscription_status = 'trial' OR v_sub.id IS NULL THEN
        v_period_start := p_payment_date;
    END IF;
    v_period_end := (v_period_start + make_interval(months => v_months))::date;

    INSERT INTO public.subscription_payments (
        business_id, amount, original_amount, discount_percentage, payment_cycle,
        months_covered, payment_date, period_start, period_end, status, method, notes, registered_by
    ) VALUES (
        p_business_id, v_amount, v_monthly * v_months,
        CASE WHEN v_monthly * v_months > 0
             THEN greatest(0, round((1 - v_amount / (v_monthly * v_months)) * 100, 2)) ELSE 0 END,
        CASE WHEN v_months = 1 THEN 'monthly' WHEN v_months = 3 THEN 'quarterly' ELSE v_months || '_months' END,
        v_months, p_payment_date, v_period_start, v_period_end, 'completed',
        nullif(trim(coalesce(p_method, '')), ''), nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
    )
    RETURNING id INTO v_payment_id;

    IF v_sub.id IS NULL THEN
        INSERT INTO public.subscriptions (business_id, plan_name, spaces_included, spaces_used,
                                          monthly_price, currency, status, billing_start, next_billing_date)
        VALUES (p_business_id, 'Plan', 1, 0, v_monthly, 'ARS', 'active', v_period_start, v_period_end);
    ELSE
        UPDATE public.subscriptions
        SET status = 'active',
            billing_start = coalesce(billing_start, v_period_start),
            next_billing_date = v_period_end,
            updated_at = now()
        WHERE id = v_sub.id;
    END IF;

    UPDATE public.businesses
    SET subscription_status = 'active',
        subscription_start_date = coalesce(subscription_start_date, v_period_start::timestamptz),
        payment_cycle = CASE WHEN v_months = 3 THEN 'quarterly' ELSE 'monthly' END
    WHERE id = p_business_id
    RETURNING * INTO v_business;

    -- Comisión del vendedor: 40% / 30% / 20% / 10% (meses 1, 2, 3, 4 a 6) + 5% con 50 clientes activos
    IF v_business.seller_id IS NOT NULL THEN
        v_sub_month := greatest(1,
            (extract(year FROM age(p_payment_date, v_business.subscription_start_date::date)) * 12
             + extract(month FROM age(p_payment_date, v_business.subscription_start_date::date)))::int + 1);
        v_rate := CASE
            WHEN v_sub_month = 1 THEN 40
            WHEN v_sub_month = 2 THEN 30
            WHEN v_sub_month = 3 THEN 20
            WHEN v_sub_month BETWEEN 4 AND 6 THEN 10
            ELSE 0 END;

        IF v_rate > 0 THEN
            SELECT count(*) INTO v_active_clients
            FROM public.businesses
            WHERE seller_id = v_business.seller_id AND subscription_status = 'active';
            IF v_active_clients >= 50 THEN v_bonus := 5; END IF;

            INSERT INTO public.seller_commissions (
                seller_id, business_id, payment_id, subscription_month, base_commission_rate,
                volume_bonus, total_commission_rate, commission_amount, payment_amount,
                period_month, period_year, active_clients_count
            ) VALUES (
                v_business.seller_id, p_business_id, v_payment_id, v_sub_month, v_rate,
                v_bonus, v_rate + v_bonus, round(v_amount * (v_rate + v_bonus) / 100, 2), v_amount,
                extract(month FROM p_payment_date)::int, extract(year FROM p_payment_date)::int, v_active_clients
            )
            RETURNING id INTO v_commission_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'payment_id', v_payment_id,
        'amount', v_amount,
        'period_start', v_period_start,
        'period_end', v_period_end,
        'commission_id', v_commission_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_subscription_payment(text, integer, numeric, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_subscription_payment(text, integer, numeric, text, date, text) TO authenticated;

-- 4. Las comisiones solo las genera el servidor; los vendedores solo las leen
DROP POLICY IF EXISTS "commissions_write" ON public.seller_commissions;
CREATE POLICY "commissions_admin_write" ON public.seller_commissions
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Los pagos se registran por la función; el insert directo queda solo para el superadmin
DROP POLICY IF EXISTS "payments_write" ON public.subscription_payments;
CREATE POLICY "payments_admin_write" ON public.subscription_payments
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());
