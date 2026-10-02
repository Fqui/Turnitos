-- Precios de suscripción definidos el 2026-10-02.
-- Debe coincidir con calculateSubscriptionPrice() en src/utils/subscriptionUtils.js
--   Servicios: 1 → $17.000 · 2 → $25.000 · 3 → $32.000 · +$10.000 por cada uno después del 3º
--   Deportes:  1-3 canchas → $20.000 c/u · 4-5 → $17.000 c/u · 6+ → $15.000 c/u
--   Alquiler:  $15.000
CREATE OR REPLACE FUNCTION public.calculate_subscription_price(p_business_type text, p_spaces integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN p_business_type IN ('sport', 'courts') THEN
            CASE WHEN greatest(1, coalesce(p_spaces, 1)) <= 3 THEN greatest(1, coalesce(p_spaces, 1)) * 20000
                 WHEN p_spaces <= 5 THEN p_spaces * 17000
                 ELSE p_spaces * 15000 END
        WHEN p_business_type IN ('venue', 'alquiler', 'rental') THEN 15000
        ELSE
            CASE WHEN greatest(1, coalesce(p_spaces, 1)) = 1 THEN 17000
                 WHEN p_spaces = 2 THEN 25000
                 ELSE 32000 + (p_spaces - 3) * 10000 END
    END::numeric;
$$;

-- Recalcular las suscripciones existentes con los precios nuevos
UPDATE public.subscriptions s
SET monthly_price = public.calculate_subscription_price(b.type, s.spaces_included),
    updated_at = now()
FROM public.businesses b
WHERE b.id = s.business_id;
