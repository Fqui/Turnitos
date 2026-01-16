-- Script de diagnóstico para Spa Zen
-- Verifica la estructura de datos

-- 1. Verificar el negocio
SELECT id, name, type FROM businesses WHERE id = 'spa-zen';

-- 2. Verificar recursos/especialistas
SELECT * FROM resources WHERE business_id = 'spa-zen';

-- 3. Si no hay en resources, verificar en specialists (tabla antigua)
SELECT * FROM specialists WHERE business_id = 'spa-zen';

-- 4. Ver estructura de la tabla resources
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'resources';

-- 5. Ver todas las tablas relacionadas con especialistas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%specialist%' OR table_name LIKE '%resource%');
