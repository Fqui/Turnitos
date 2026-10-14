-- ========================================
-- MIGRACIÓN 1: Agregar columna slug
-- ========================================

-- Add slug column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add metadata column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique ON businesses(slug);

-- Generate slugs for existing businesses based on their names
UPDATE businesses
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            TRANSLATE(
                name,
                'áéíóúñÁÉÍÓÚÑ',
                'aeiounAEIOUN'
            ),
            '[^a-zA-Z0-9\s-]',
            '',
            'g'
        ),
        '\s+',
        '-',
        'g'
    )
)
WHERE slug IS NULL;

-- Handle duplicate slugs by appending a number
DO $$
DECLARE
    r RECORD;
    new_slug TEXT;
    counter INTEGER;
BEGIN
    FOR r IN 
        SELECT id, slug
        FROM businesses
        WHERE slug IN (
            SELECT slug
            FROM businesses
            GROUP BY slug
            HAVING COUNT(*) > 1
        )
        ORDER BY created_at
    LOOP
        counter := 1;
        new_slug := r.slug || '-' || counter;
        
        WHILE EXISTS (SELECT 1 FROM businesses WHERE slug = new_slug) LOOP
            counter := counter + 1;
            new_slug := r.slug || '-' || counter;
        END LOOP;
        
        UPDATE businesses SET slug = new_slug WHERE id = r.id;
    END LOOP;
END $$;

-- Make slug NOT NULL after populating
ALTER TABLE businesses ALTER COLUMN slug SET NOT NULL;


-- ========================================
-- MIGRACIÓN 2: Crear negocio de prueba
-- ========================================

-- Insert a test venue/alquiler business
INSERT INTO businesses (
    name,
    slug,
    type,
    location,
    email,
    password,
    whatsapp,
    latitude,
    longitude,
    max_capacity,
    capacity,
    pricing_model,
    price_per_hour,
    rental_duration_options,
    pricing_tiers,
    additional_services,
    amenities,
    blocked_dates,
    gallery_images,
    metadata,
    category_id,
    seller_id,
    subscription_plan_id,
    subscription_status,
    theme,
    primary_color,
    button_color,
    rating,
    booking_rules,
    payment_settings,
    password_changed
) VALUES (
    'Quincho El Paraíso',
    'quincho-el-paraiso',
    'alquiler',
    'Av. Circunvalación 1234, La Rioja',
    'quincho.paraiso@turnitoslr.com',
    'Quincho2024!',
    '5493804123456',
    -29.4130,
    -66.8558,
    80,
    80,
    'hourly',
    5000,
    '[4, 6, 8, 12, 24]',
    '[
        {"min": 1, "max": 30, "price": 5000},
        {"min": 31, "max": 50, "price": 7000},
        {"min": 51, "max": 80, "price": 9000}
    ]',
    '[
        {"id": "svc1", "name": "DJ Profesional", "price": 15000, "icon": "🎵", "description": "DJ con equipo de sonido profesional"},
        {"id": "svc2", "name": "Servicio de Catering", "price": 25000, "icon": "🍽️", "description": "Catering completo para 50 personas"},
        {"id": "svc3", "name": "Decoración Temática", "price": 10000, "icon": "🎈", "description": "Decoración personalizada según tu evento"},
        {"id": "svc4", "name": "Fotografía Profesional", "price": 20000, "icon": "📸", "description": "Sesión fotográfica de 4 horas"}
    ]',
    ARRAY['Piscina', 'Parrilla', 'WiFi', 'Aire Acondicionado', 'Parking', 'Sonido', 'Cocina Equipada', 'Baños Completos', 'Jardín', 'Quincho Cubierto', 'Zona de Juegos', 'Iluminación LED']::TEXT[],
    '[
        {"date": "2026-02-15", "reason": "Evento privado"},
        {"date": "2026-02-22", "reason": "Mantenimiento"},
        {"date": "2026-03-01", "reason": "Reservado"}
    ]',
    '[
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800"
    ]',
    '{
        "venue_gallery": [
            {
                "url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
                "caption": "Piscina Principal",
                "category": "Exterior"
            },
            {
                "url": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200",
                "caption": "Salón Cubierto",
                "category": "Interior"
            },
            {
                "url": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200",
                "caption": "Zona de Parrilla",
                "category": "Exterior"
            },
            {
                "url": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200",
                "caption": "Vista Nocturna",
                "category": "Exterior"
            },
            {
                "url": "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200",
                "caption": "Cocina Equipada",
                "category": "Interior"
            },
            {
                "url": "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=1200",
                "caption": "Baños Modernos",
                "category": "Interior"
            },
            {
                "url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
                "caption": "Jardín y Juegos",
                "category": "Exterior"
            },
            {
                "url": "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1200",
                "caption": "Estacionamiento",
                "category": "Exterior"
            }
        ],
        "description": "Hermoso quincho con piscina, ideal para eventos familiares y celebraciones. Cuenta con amplio espacio cubierto, parrilla profesional, baños completos y zona de juegos para niños. Capacidad para hasta 80 personas."
    }',
    (SELECT id FROM categories WHERE name = 'Quinchos' LIMIT 1),
    (SELECT id FROM sellers LIMIT 1),
    (SELECT id FROM subscription_plans LIMIT 1),
    'active',
    'light',
    '#84CC16',
    '#84CC16',
    '4.8',
    '{
        "time": {
            "max_duration": 1440,
            "min_duration": 240,
            "buffer_minutes": 0
        },
        "limits": {
            "max_per_day": 1,
            "max_per_week": 7
        },
        "cancellation": {
            "refund_policy": "partial",
            "deadline_hours": 48
        },
        "requirements": {
            "terms_text": "Se requiere seña del 30% para confirmar la reserva. El saldo restante se abona el día del evento.",
            "phone_required": true,
            "email_verification": false
        },
        "advance_booking": {
            "max_days": 90,
            "min_hours": 48
        }
    }',
    '{
        "deposit": {
            "type": "percentage",
            "enabled": true,
            "percentage": 30,
            "fixed_amount": 0
        },
        "methods": [
            {"type": "transfer", "enabled": true},
            {"type": "cash", "enabled": true}
        ],
        "bank_details": {
            "bank_name": "Banco Nación",
            "account_holder": "Juan Pérez",
            "cbu": "0110599520000012345678",
            "alias": "quincho.paraiso"
        },
        "instructions": "Transferir la seña del 30% a la cuenta indicada. El saldo restante se abona en efectivo el día del evento."
    }',
    true
) ON CONFLICT (email) DO UPDATE SET
    slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    location = EXCLUDED.location,
    whatsapp = EXCLUDED.whatsapp,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    max_capacity = EXCLUDED.max_capacity,
    capacity = EXCLUDED.capacity,
    pricing_model = EXCLUDED.pricing_model,
    price_per_hour = EXCLUDED.price_per_hour,
    rental_duration_options = EXCLUDED.rental_duration_options,
    pricing_tiers = EXCLUDED.pricing_tiers,
    additional_services = EXCLUDED.additional_services,
    amenities = EXCLUDED.amenities,
    blocked_dates = EXCLUDED.blocked_dates,
    gallery_images = EXCLUDED.gallery_images,
    metadata = EXCLUDED.metadata;

-- Display success message
DO $$
DECLARE
    v_business_id UUID;
    v_slug TEXT;
BEGIN
    SELECT id, slug INTO v_business_id, v_slug FROM businesses WHERE email = 'quincho.paraiso@turnitoslr.com';
    
    IF v_business_id IS NOT NULL THEN
        RAISE NOTICE '✅ Venue created/updated successfully!';
        RAISE NOTICE '📍 Access URL: http://localhost:5175/%/turnos', v_slug;
        RAISE NOTICE '📧 Email: quincho.paraiso@turnitoslr.com';
        RAISE NOTICE '🔑 Password: Quincho2024!';
        RAISE NOTICE '🆔 Business ID: %', v_business_id;
    ELSE
        RAISE NOTICE '❌ Business creation failed';
    END IF;
END $$;
