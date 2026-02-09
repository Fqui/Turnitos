-- Add slug column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS slug TEXT;

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
