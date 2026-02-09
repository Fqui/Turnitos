-- Migration: Add metadata column to businesses table
-- Date: 2026-02-05
-- Description: Add metadata jsonb column for flexible business configuration

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN businesses.metadata IS 'Metadata for business specific configurations (ex: venue gallery, extra descriptions)';
