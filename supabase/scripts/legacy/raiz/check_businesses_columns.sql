-- Check all columns in businesses table
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;
