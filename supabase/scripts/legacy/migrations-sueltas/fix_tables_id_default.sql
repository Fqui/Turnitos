-- FIX: Agregar generación automática de UUIDs para las tablas principales
-- Ejecutar en Supabase SQL Editor

-- 1. Habilitar extensión UUID si no está (por si acaso)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Corregir tabla COURTS (Canchas)
ALTER TABLE courts 
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 3. Corregir tabla SERVICES (Servicios)
ALTER TABLE services 
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 4. Corregir tabla SPECIALISTS (Especialistas)
ALTER TABLE specialists 
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Verificar
SELECT 'Columnas ID corregidas con DEFAULT uuid_generate_v4()' as status;
