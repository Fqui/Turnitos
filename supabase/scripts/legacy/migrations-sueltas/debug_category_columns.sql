-- Check columns in businesses and services tables
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('businesses', 'services') 
AND column_name LIKE '%category%';
