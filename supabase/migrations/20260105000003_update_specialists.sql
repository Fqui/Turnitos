-- Migration: Update specialists table
-- Date: 2026-01-05
-- Description: Add buffer_minutes field to specialists

-- Add buffer_minutes column if it doesn't exist
ALTER TABLE specialists 
ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 15;

COMMENT ON COLUMN specialists.buffer_minutes IS 'Minimum time between appointments for this specialist (overrides service buffer)';
COMMENT ON TABLE specialists IS 'Specialists for SERVICE businesses. Count limited by subscription.spaces_included';
