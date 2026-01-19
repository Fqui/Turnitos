-- Create super_admins table
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

-- Create super admin user
INSERT INTO super_admins (id, email, password, first_name, last_name) VALUES
  (gen_random_uuid()::text, 'admin@turnitoslr.com', 'superadmin123', 'Super', 'Admin')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE super_admins IS 'Super administradores con acceso total al sistema';
