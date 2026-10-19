-- La página pública lee los negocios desde businesses_public.
-- Se suma al final home_service (anillos de km y recargo de traslado), que es información pública
-- del negocio y la reserva a domicilio necesita para calcular la distancia y el recargo.
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
    b.location_point,
    b.home_service
FROM public.businesses b;
