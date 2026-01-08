-- Migration: Add gallery highlights structure
-- Date: 2026-01-08
-- Description: Add JSONB column for Instagram-style gallery highlights with categories

-- Add new column for highlights
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS gallery_highlights JSONB DEFAULT '[]'::jsonb;

-- Migrate existing gallery_images to highlights format
-- Creates a single highlight called "Galería" with all existing images
UPDATE businesses 
SET gallery_highlights = (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'title', 'Galería',
      'cover_image', gallery_images->0,
      'images', gallery_images,
      'order', 0
    )
  )
)
WHERE gallery_images IS NOT NULL 
AND jsonb_array_length(gallery_images) > 0
AND (gallery_highlights IS NULL OR gallery_highlights = '[]'::jsonb);

-- Add comment
COMMENT ON COLUMN businesses.gallery_highlights IS 'Instagram-style gallery highlights with categories. Each highlight contains: id, title, cover_image, images array, and order';
