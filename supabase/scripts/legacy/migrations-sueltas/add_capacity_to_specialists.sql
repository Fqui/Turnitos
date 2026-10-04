-- Script para actualizar la capacidad de especialistas (para servicios)

-- Ver todos los especialistas
SELECT id, name, role, business_id 
FROM specialists 
ORDER BY name;

-- ⚠️ PROBLEMA: La tabla specialists NO tiene columna 'capacity'
-- Necesitamos agregarla primero

-- Agregar columna capacity a la tabla specialists
ALTER TABLE specialists 
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1;

-- Actualizar todos los especialistas a capacity = 2 para testing
UPDATE specialists 
SET capacity = 2;

-- Verificar el cambio
SELECT id, name, role, capacity FROM specialists;
