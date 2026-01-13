-- RPC function to find nearby businesses
-- Radius is in meters
CREATE OR REPLACE FUNCTION get_nearby_businesses(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 5000
)
RETURNS SETOF businesses
LANGUAGE sql
AS $$
    SELECT *
    FROM businesses
    WHERE ST_DWithin(
        location_point,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_meters
    )
    ORDER BY 
        location_point <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
$$;
