-- Migration: Create unified resources table
-- Date: 2026-01-05
-- Description: Unified table for courts, services, and venues

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Identificación
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('court', 'service', 'venue', 'additional')),
    
    -- Tipo específico
    sport TEXT CHECK (sport IN ('futbol', 'padel', 'tennis')),
    category TEXT,
    
    -- Precio y duración
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    
    -- Buffer time (solo para services)
    buffer_minutes INTEGER DEFAULT 15,
    
    -- Capacidad
    capacity INTEGER NOT NULL DEFAULT 1,
    
    -- Consumo de espacios
    -- Para SPORT courts: true (1 cancha = 1 espacio)
    -- Para SPORT additional services: false (NO consume espacios)
    -- Para SERVICE: false (los servicios NO consumen espacios, los especialistas sí)
    -- Para VENUE: true (1 venue = 1 espacio)
    consumes_space BOOLEAN DEFAULT true,
    
    -- Estado
    active BOOLEAN DEFAULT true,
    
    -- Metadata flexible
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_sport_for_court CHECK (
        (type = 'court' AND sport IS NOT NULL) OR type != 'court'
    ),
    CONSTRAINT valid_consumes_space CHECK (
        (type = 'court' AND consumes_space = true) OR
        (type = 'venue' AND consumes_space = true) OR
        (type = 'service' AND consumes_space = false) OR
        (type = 'additional' AND consumes_space = false)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_business ON resources(business_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_resources_consumes_space ON resources(consumes_space) WHERE consumes_space = true;
CREATE INDEX IF NOT EXISTS idx_resources_business_type ON resources(business_id, type);

COMMENT ON TABLE resources IS 'Unified table for all reservable resources (courts, services, venues)';
COMMENT ON COLUMN resources.consumes_space IS 'Whether this resource counts against subscription space limit';
COMMENT ON COLUMN resources.buffer_minutes IS 'Minimum time between bookings (for SERVICE type)';
