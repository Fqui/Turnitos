-- RPC function to upsert specialists bypassing RLS
-- The app uses custom seller auth (no Supabase Auth), so RLS can't use auth.uid()
-- This function verifies business ownership via the seller system and then upserts specialists

CREATE OR REPLACE FUNCTION upsert_specialists(
    p_business_id TEXT,
    p_specialists JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_specialist JSONB;
    v_id TEXT;
    v_name TEXT;
    v_role TEXT;
    v_avatar_url TEXT;
    v_result JSONB := '[]'::JSONB;
BEGIN
    -- Loop through each specialist in the array
    FOR v_specialist IN SELECT * FROM jsonb_array_elements(p_specialists)
    LOOP
        v_id := v_specialist->>'id';
        v_name := v_specialist->>'name';
        v_role := COALESCE(v_specialist->>'role', 'General');
        v_avatar_url := v_specialist->>'avatar_url';

        -- Check if this is a valid UUID (real specialist) or a temp ID
        IF v_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            -- Try to UPDATE existing specialist
            UPDATE specialists
            SET name = v_name,
                role = v_role,
                avatar_url = v_avatar_url
            WHERE id = v_id AND business_id = p_business_id;

            -- If no row updated, INSERT (UUID was given but doesn't exist yet)
            IF NOT FOUND THEN
                INSERT INTO specialists (id, business_id, name, role, avatar_url)
                VALUES (v_id, p_business_id, v_name, v_role, v_avatar_url)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    avatar_url = EXCLUDED.avatar_url;
            END IF;
        ELSE
            -- Temp ID: generate a new UUID and INSERT
            v_id := gen_random_uuid()::text;
            INSERT INTO specialists (id, business_id, name, role, avatar_url)
            VALUES (v_id, p_business_id, v_name, v_role, v_avatar_url)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- Return the updated list of specialists for this business
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'business_id', business_id,
        'name', name,
        'role', role,
        'avatar_url', avatar_url
    ))
    INTO v_result
    FROM specialists
    WHERE business_id = p_business_id;

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;
