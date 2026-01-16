-- Verificar las columnas de la tabla bookings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
