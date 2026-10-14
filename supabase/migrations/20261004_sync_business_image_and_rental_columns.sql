-- Logo/banner and rental settings were saved to one place and read from another.
-- From now on the portal writes both; this syncs the existing rows once.
UPDATE businesses SET logo = logo_url WHERE logo_url IS NOT NULL AND logo IS DISTINCT FROM logo_url;
UPDATE businesses SET banner_image = banner_url WHERE banner_url IS NOT NULL AND banner_image IS DISTINCT FROM banner_url;
UPDATE businesses SET pricing_tiers = metadata->'pricing_tiers'
  WHERE jsonb_typeof(metadata->'pricing_tiers') = 'array' AND pricing_tiers IS DISTINCT FROM metadata->'pricing_tiers';
UPDATE businesses SET blocked_dates = metadata->'blocked_dates'
  WHERE jsonb_typeof(metadata->'blocked_dates') = 'array' AND blocked_dates IS DISTINCT FROM metadata->'blocked_dates';
