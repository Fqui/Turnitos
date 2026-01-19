-- Ensure payment_settings column exists
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS payment_settings jsonb DEFAULT '{}'::jsonb;

-- Ensure banking fields exist (just in case the previous one didn't run)
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_holder text,
ADD COLUMN IF NOT EXISTS cbu text,
ADD COLUMN IF NOT EXISTS bank_alias text;
