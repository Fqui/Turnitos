-- Add max_capacity column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 1;

-- If you want to update existing rows to strictly 1 (though DEFAULT handles new/null usually, existing nulls might stay null depending on DB)
UPDATE businesses SET max_capacity = 1 WHERE max_capacity IS NULL;
