-- Make old_category nullable since it's deprecated and replaced by category_id
ALTER TABLE businesses 
  ALTER COLUMN old_category DROP NOT NULL;
