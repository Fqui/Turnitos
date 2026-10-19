-- Servicios a domicilio (etapa 1): modalidad por servicio y anillos de cobertura por negocio.
-- Aplicada en producción el 2026-10-19.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS location_mode text NOT NULL DEFAULT 'local';

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_location_mode_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_location_mode_check CHECK (location_mode IN ('local', 'home', 'both'));

-- {"rings": [{"km": 3, "fee": 0}, {"km": 6, "fee": 1500}]} ordenados por km. Fuera del último anillo no llega.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS home_service jsonb;

COMMENT ON COLUMN public.services.location_mode IS 'Dónde se presta: local | home | both';
COMMENT ON COLUMN public.businesses.home_service IS 'Cobertura a domicilio: {"rings":[{"km":number,"fee":number}]}';
