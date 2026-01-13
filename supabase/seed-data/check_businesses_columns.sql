-- Verificar columnas de businesses
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'businesses'
ORDER BY column_name;
