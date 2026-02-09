-- Migration: Add venue-specific fields for rental businesses
-- Date: 2026-01-29
-- Description: Add pricing tiers, blocked dates, and booking fields for venue rentals

-- =====================================================
-- BUSINESSES TABLE - Add venue pricing fields
-- =====================================================

-- Pricing tiers by guest count (allows dynamic pricing based on party size)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS pricing_tiers jsonb DEFAULT '[]'::jsonb;

-- Blocked dates for manual blocking (holidays, maintenance, private events)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS blocked_dates jsonb DEFAULT '[]'::jsonb;

-- Comments for documentation
COMMENT ON COLUMN businesses.pricing_tiers IS 'Price tiers by guest count. Format: [{"min": 1, "max": 30, "price": 3000, "label": "1-30 personas"}]';
COMMENT ON COLUMN businesses.blocked_dates IS 'Manually blocked dates. Format: [{"date": "2026-02-14", "reason": "Evento privado"}]';

-- =====================================================
-- BOOKINGS TABLE - Add venue booking fields
-- =====================================================

-- Number of guests for the reservation
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_count integer;

-- Selected additional services (array of service IDs)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS selected_services jsonb DEFAULT '[]'::jsonb;

-- Total price of additional services
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS services_total numeric DEFAULT 0;

-- Base price before additional services
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS base_price numeric;

-- Comments for documentation
COMMENT ON COLUMN bookings.guest_count IS 'Number of guests for venue bookings';
COMMENT ON COLUMN bookings.selected_services IS 'Array of selected additional service objects: [{id, name, price}]';
COMMENT ON COLUMN bookings.services_total IS 'Total price of all selected additional services';
COMMENT ON COLUMN bookings.base_price IS 'Base rental price before additional services';

-- =====================================================
-- EXAMPLE DATA STRUCTURES
-- =====================================================

/*
Example pricing_tiers:
[
  {"min": 1, "max": 30, "price": 3000, "label": "1-30 personas"},
  {"min": 31, "max": 60, "price": 4500, "label": "31-60 personas"},
  {"min": 61, "max": 100, "price": 6000, "label": "61-100 personas"}
]

Example blocked_dates:
[
  {"date": "2026-02-14", "reason": "Día de San Valentín - Evento Privado"},
  {"date": "2026-03-01", "reason": "Mantenimiento"},
  {"all_day": true, "date": "2026-12-25", "reason": "Navidad - Cerrado"}
]

Example additional_services (already exists in businesses):
[
  {"id": 1, "name": "Decoración Temática", "description": "Personaliza tu evento", "price": 800, "icon": "🎨"},
  {"id": 2, "name": "Servicio de Catering", "description": "Menú completo", "price": 1500, "icon": "🍽️"},
  {"id": 3, "name": "DJ Profesional", "description": "Música en vivo", "price": 2000, "icon": "🎧"}
]

Example selected_services in booking:
[
  {"id": 1, "name": "Decoración Temática", "price": 800},
  {"id": 3, "name": "DJ Profesional", "price": 2000}
]
*/
