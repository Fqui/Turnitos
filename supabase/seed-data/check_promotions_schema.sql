-- Verificar tipo de dato de promotions.business_id
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'promotions' AND column_name = 'business_id';
