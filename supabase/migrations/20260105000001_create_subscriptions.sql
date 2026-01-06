-- Migration: Create subscriptions table and plans
-- Date: 2026-01-05
-- Description: Add subscription management for monetization model

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Plan contratado
    plan_name TEXT NOT NULL,
    spaces_included INTEGER NOT NULL DEFAULT 1,
    spaces_used INTEGER NOT NULL DEFAULT 0,
    
    -- Facturación
    monthly_price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'ARS',
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'suspended', 'cancelled')),
    
    -- Período de facturación
    billing_start DATE NOT NULL,
    billing_end DATE,
    next_billing_date DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_spaces CHECK (spaces_used <= spaces_included)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON subscriptions(next_billing_date) 
    WHERE status = 'active';

-- Create subscription plans reference table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    business_type TEXT NOT NULL CHECK (business_type IN ('sport', 'service', 'venue')),
    name TEXT NOT NULL,
    spaces INTEGER NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    price_per_space DECIMAL(10,2),
    features JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert plans for SPORT (Canchas)
-- Hasta 3 canchas: $10,000 c/u
-- Más de 3 canchas: $8,000 c/u
INSERT INTO subscription_plans (id, business_type, name, spaces, monthly_price, price_per_space, features) VALUES
('sport_1', 'sport', '1 Cancha', 1, 10000, 10000, '{"support": "email"}'),
('sport_2', 'sport', '2 Canchas', 2, 20000, 10000, '{"support": "email"}'),
('sport_3', 'sport', '3 Canchas', 3, 30000, 10000, '{"support": "priority"}'),
('sport_4', 'sport', '4 Canchas', 4, 32000, 8000, '{"support": "priority", "analytics": true}'),
('sport_5', 'sport', '5 Canchas', 5, 40000, 8000, '{"support": "priority", "analytics": true}'),
('sport_10', 'sport', '10 Canchas', 10, 80000, 8000, '{"support": "24/7", "analytics": true}')
ON CONFLICT (id) DO NOTHING;

-- Insert plans for SERVICE (Especialistas)
INSERT INTO subscription_plans (id, business_type, name, spaces, monthly_price, price_per_space, features) VALUES
('service_1', 'service', '1 Especialista', 1, 9990, 9990, '{"support": "email"}'),
('service_2', 'service', '2 Especialistas', 2, 12990, 6495, '{"support": "email"}'),
('service_3', 'service', '3 Especialistas', 3, 15990, 5330, '{"support": "priority"}'),
('service_4', 'service', '4 Especialistas', 4, 18990, 4747, '{"support": "priority", "analytics": true}'),
('service_5', 'service', '5+ Especialistas', 5, 21990, 4398, '{"support": "24/7", "analytics": true, "custom_features": true}')
ON CONFLICT (id) DO NOTHING;

-- Insert plans for VENUE (Alquileres)
INSERT INTO subscription_plans (id, business_type, name, spaces, monthly_price, price_per_space, features) VALUES
('venue_1', 'venue', '1 Espacio', 1, 8000, 8000, '{"support": "email", "calendar_sync": true}')
ON CONFLICT (id) DO NOTHING;

-- Create default subscriptions for existing businesses
-- This gives all existing businesses a free trial period
INSERT INTO subscriptions (business_id, plan_name, spaces_included, monthly_price, status, billing_start, next_billing_date)
SELECT 
    id as business_id,
    CASE 
        WHEN type = 'sport' THEN 'sport_3'
        WHEN type = 'service' THEN 'service_3'
        WHEN type = 'venue' THEN 'venue_1'
        ELSE 'sport_1'
    END as plan_name,
    3 as spaces_included,
    CASE 
        WHEN type = 'sport' THEN 30000
        WHEN type = 'service' THEN 15990
        WHEN type = 'venue' THEN 8000
        ELSE 10000
    END as monthly_price,
    'active' as status,
    CURRENT_DATE as billing_start,
    CURRENT_DATE + INTERVAL '30 days' as next_billing_date
FROM businesses
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions WHERE subscriptions.business_id = businesses.id
);

COMMENT ON TABLE subscriptions IS 'Subscription management for business monetization';
COMMENT ON TABLE subscription_plans IS 'Available subscription plans by business type';
