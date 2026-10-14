-- Script para crear super admin
-- Ejecutar este SQL en Supabase Dashboard > SQL Editor

-- 1. Crear tabla super_admins si no existe
CREATE TABLE IF NOT EXISTS super_admins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insertar super admin por defecto
INSERT INTO super_admins (id, email, password, first_name, last_name) 
VALUES (gen_random_uuid()::text, 'admin@turnitoslr.com', 'superadmin123', 'Super', 'Admin')
ON CONFLICT (email) DO NOTHING;

-- 3. Verificar que se creó correctamente
SELECT * FROM super_admins;
