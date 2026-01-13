DO $$
DECLARE
    business_record RECORD;
    amenity_text TEXT;
    amenity_uuid UUID;
BEGIN
    -- Loop through all businesses
    FOR business_record IN SELECT id, amenities, included_amenities FROM businesses LOOP
        
        -- Process 'amenities' column (TEXT[])
        IF business_record.amenities IS NOT NULL THEN
            BEGIN
                FOREACH amenity_text IN ARRAY business_record.amenities LOOP
                    -- clean up whitespace
                    amenity_text := TRIM(amenity_text);
                    
                    IF amenity_text <> '' THEN
                        -- Ensure amenity exists in catalog
                        INSERT INTO amenities (name, icon_key, category)
                        VALUES (amenity_text, 'Check', 'general')
                        ON CONFLICT (name) DO NOTHING;
                        
                        -- Get the UUID
                        SELECT id INTO amenity_uuid FROM amenities WHERE name = amenity_text;
                        
                        -- Link to business
                        INSERT INTO business_amenities (business_id, amenity_id)
                        VALUES (business_record.id, amenity_uuid)
                        ON CONFLICT DO NOTHING;
                    END IF;
                END LOOP;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Skipping amenities for business % due to type error (possible JSONB?)', business_record.id;
            END;
        END IF;

        -- Process 'included_amenities' column (JSONB)
        IF business_record.included_amenities IS NOT NULL THEN
            -- Iterate over JSONB array using jsonb_array_elements_text
            FOR amenity_text IN SELECT * FROM jsonb_array_elements_text(business_record.included_amenities) LOOP
                amenity_text := TRIM(amenity_text);
                
                IF amenity_text <> '' THEN
                    -- Ensure amenity exists in catalog
                    INSERT INTO amenities (name, icon_key, category)
                    VALUES (amenity_text, 'Check', 'comfort')
                    ON CONFLICT (name) DO NOTHING;
                    
                    -- Get the UUID
                    SELECT id INTO amenity_uuid FROM amenities WHERE name = amenity_text;
                    
                    -- Link to business
                    INSERT INTO business_amenities (business_id, amenity_id)
                    VALUES (business_record.id, amenity_uuid)
                    ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;
        
    END LOOP;
END $$;
