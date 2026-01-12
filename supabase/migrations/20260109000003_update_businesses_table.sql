-- Drop the old type constraint first to avoid violations during migration
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_type_check;

-- Update existing businesses with type 'venue' to 'alquiler'
UPDATE businesses 
SET type = 'alquiler' 
WHERE type = 'venue';

-- Rename old category column if it exists (to preserve old data)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'category'
  ) THEN
    ALTER TABLE businesses RENAME COLUMN category TO old_category;
  END IF;
END $$;

-- Add new columns to businesses table
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id),
  ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

-- Now add the type constraint with the new valid values
ALTER TABLE businesses 
  ADD CONSTRAINT businesses_type_check 
  CHECK (type IN ('sport', 'service', 'alquiler'));

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_subcategory_id ON businesses(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_plan_id ON businesses(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);

-- Add unique constraint on email (only if email is not null)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_email_unique'
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_email_unique UNIQUE (email);
  END IF;
END $$;
