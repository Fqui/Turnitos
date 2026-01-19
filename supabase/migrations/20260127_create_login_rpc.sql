-- Function to log in a business securely
-- bypassing RLS for the credential check
CREATE OR REPLACE FUNCTION login_business(p_email TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with permissions of the creator (postgres/admin)
SET search_path = public
AS $$
DECLARE
    v_business RECORD;
BEGIN
    -- Find business by email and password
    SELECT * INTO v_business
    FROM businesses
    WHERE email = p_email AND password = p_password
    LIMIT 1;

    -- If found, return business data (excluding password if possible, but for now specific fields)
    IFFOUND THEN
        RETURN to_jsonb(v_business);
    ELSE
        RETURN NULL;
    END IF;
END;
$$;
