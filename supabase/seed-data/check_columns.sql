-- Verificar las columnas de la tabla businesses
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
