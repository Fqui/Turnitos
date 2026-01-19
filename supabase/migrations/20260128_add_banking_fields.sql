-- Agregar columnas de datos bancarios a la tabla businesses
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_holder text,
ADD COLUMN IF NOT EXISTS cbu text,
ADD COLUMN IF NOT EXISTS bank_alias text;

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS payment_settings jsonb DEFAULT '{}'::jsonb;