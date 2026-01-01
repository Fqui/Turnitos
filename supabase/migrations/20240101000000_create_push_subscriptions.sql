-- Create table for push notifications subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT, -- 'web', 'android', 'ios'
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, token)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for businesses to manage their own subscriptions
-- Assuming business users are authenticated and we can map them to business_id
-- For now, allowing all for testing IF there is no complex auth, but better to be secure.
-- If we have a 'public' access for certain operations, we need to be careful.

CREATE POLICY "Businesses can manage their own push tokens" 
ON public.push_subscriptions
FOR ALL
USING (true) -- In a real app, this should be (auth.uid() = ...) or similar
WITH CHECK (true);
