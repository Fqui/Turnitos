-- Seed data: Create test sellers
-- Note: Using gen_random_uuid()::text to generate TEXT IDs compatible with businesses table
INSERT INTO sellers (id, first_name, last_name, email, password, phone, is_active) VALUES
  (gen_random_uuid()::text, 'Juan', 'Pérez', 'juan.perez@turnitoslr.com', 'seller123', '+54 9 11 1234-5678', true),
  (gen_random_uuid()::text, 'María', 'González', 'maria.gonzalez@turnitoslr.com', 'seller123', '+54 9 11 8765-4321', true)
ON CONFLICT (email) DO NOTHING;

-- Note: In production, passwords should be hashed
-- This is just for testing purposes
