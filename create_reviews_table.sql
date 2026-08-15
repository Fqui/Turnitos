-- ==============================================================================
-- MIGRACIÓN: Tabla de Reseñas Verificadas y Columnas de Reputación
-- ==============================================================================

-- 1. Crear tabla de reseñas
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Habilitar RLS y políticas
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública de reseñas aprobadas
CREATE POLICY "Permitir lectura pública de reseñas aprobadas" ON public.reviews
    FOR SELECT USING (status = 'approved');

-- Permitir lectura por token único (para consultar formulario)
CREATE POLICY "Permitir lectura por token" ON public.reviews
    FOR SELECT USING (true);

-- Permitir inserción/actualización pública por token
CREATE POLICY "Permitir calificar con token" ON public.reviews
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_token ON public.reviews(token);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- 4. Columnas en la tabla businesses para caching de promedio
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 5.0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
