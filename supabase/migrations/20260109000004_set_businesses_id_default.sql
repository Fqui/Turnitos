-- Add default UUID generation for businesses.id if not already set
ALTER TABLE businesses 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();
