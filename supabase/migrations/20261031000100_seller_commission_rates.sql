-- Comisiones de vendedores: 50 % del primer mes y 30 % de cada mes siguiente mientras el negocio pague.
-- Los porcentajes quedan en cada vendedor (first_month_rate, recurring_rate) para poder pactar otros.
-- Un pago de varios meses reparte: el primer mes al porcentaje inicial y el resto al recurrente.

ALTER TABLE public.sellers
    ADD COLUMN IF NOT EXISTS first_month_rate numeric NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS recurring_rate numeric NOT NULL DEFAULT 30;

CREATE OR REPLACE FUNCTION public.register_subscription_payment(p_business_id text, p_months integer DEFAULT 1, p_amount numeric DEFAULT NULL::numeric, p_method text DEFAULT 'transferencia'::text, p_payment_date date DEFAULT CURRENT_DATE, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    v_first_rate numeric;
    v_recurring_rate numeric;
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

    IF v_business.seller_id IS NOT NULL THEN
        SELECT s.first_month_rate, s.recurring_rate INTO v_first_rate, v_recurring_rate
        FROM public.sellers s WHERE s.id = v_business.seller_id;
        v_first_rate := coalesce(v_first_rate, 50);
        v_recurring_rate := coalesce(v_recurring_rate, 30);

        v_sub_month := greatest(1,
            (extract(year FROM age(p_payment_date, v_business.subscription_start_date::date)) * 12
             + extract(month FROM age(p_payment_date, v_business.subscription_start_date::date)))::int + 1);
        -- First month at the initial rate, every other month covered at the recurring rate
        v_rate := CASE WHEN v_sub_month = 1
                       THEN round((v_first_rate + (v_months - 1) * v_recurring_rate) / v_months, 2)
                       ELSE v_recurring_rate END;

        IF v_rate > 0 THEN
            SELECT count(*) INTO v_active_clients
            FROM public.businesses
            WHERE seller_id = v_business.seller_id AND subscription_status = 'active';

            INSERT INTO public.seller_commissions (
                seller_id, business_id, payment_id, subscription_month, base_commission_rate,
                volume_bonus, total_commission_rate, commission_amount, payment_amount,
                period_month, period_year, active_clients_count
            ) VALUES (
                v_business.seller_id, p_business_id, v_payment_id, v_sub_month, v_rate,
                0, v_rate, round(v_amount * v_rate / 100, 2), v_amount,
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
$function$;
