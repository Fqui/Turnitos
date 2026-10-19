-- Seguridad etapa 1b (parte compatible con la app actual)
-- Prepara la base para que el público lea los negocios desde la vista businesses_public,
-- sin email, datos de la cuenta ni códigos de cupón.

-- La reserva pública revisa que el negocio exista sin depender de poder leer la tabla
CREATE OR REPLACE FUNCTION public.business_exists(p_business_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id);
$$;

GRANT EXECUTE ON FUNCTION public.business_exists(text) TO anon, authenticated;

ALTER POLICY bookings_public_insert ON public.bookings
    WITH CHECK (
        coalesce(status, 'pending') = 'pending'
        AND public.business_exists(business_id)
    );

-- Vista pública: metadata sin cupones ni plantillas de WhatsApp, y las columnas que
-- la reserva pública necesita (reglas, seña, tienda, plan para la comisión)
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT
    b.id, b.name, b.type, b.location, b.theme, b.amenities, b.logo, b.banner_image,
    b.latitude, b.longitude, b.button_color, b.instagram, b.facebook, b.whatsapp,
    b.service_categories, b.primary_color, b.time_ranges, b.price_per_hour,
    b.rental_duration_options, b.additional_services, b.included_amenities,
    b.gallery_images, b.gallery_highlights, b.tiktok, b.rating, b.pricing_model,
    b.price_per_day, b.pricing_tiers, b.blocked_dates, b.slug,
    (coalesce(b.metadata, '{}'::jsonb) - 'coupons' - 'whatsapp_templates') AS metadata,
    b.description, b.capacity_limit, b.max_capacity, b.capacity, b.logo_url, b.banner_url,
    b.hours, b.category_id, b.subscription_status, b.created_at,
    b.booking_rules, b.payment_settings, b.store_enabled, b.subscription_plan_id,
    b.location_point
FROM public.businesses b;

GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- Busca un cupón por su código exacto (quien lo pide ya conoce el código)
CREATE OR REPLACE FUNCTION public.find_business_coupon(p_business_id text, p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT c
    FROM public.businesses b,
         jsonb_array_elements(
             CASE WHEN jsonb_typeof(b.metadata->'coupons') = 'array' THEN b.metadata->'coupons' ELSE '[]'::jsonb END
         ) c
    WHERE b.id = p_business_id
      AND length(trim(coalesce(p_code, ''))) > 0
      AND upper(trim(c->>'code')) = upper(trim(p_code))
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_business_coupon(text, text) TO anon, authenticated;
