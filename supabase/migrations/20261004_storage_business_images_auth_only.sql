-- business-images: anonymous visitors could upload, replace and delete any image.
-- Only signed-in users (owners, sellers, admins) may write now. Reading stays public.
-- ALTER instead of DROP so the existing policy names stay in place.
ALTER POLICY "Public Upload" ON storage.objects
  WITH CHECK (bucket_id = 'business-images' AND auth.role() = 'authenticated');
ALTER POLICY "Public Update" ON storage.objects
  USING (bucket_id = 'business-images' AND auth.role() = 'authenticated');
ALTER POLICY "Public Delete" ON storage.objects
  USING (bucket_id = 'business-images' AND auth.role() = 'authenticated');

-- Images only, up to 10 MB.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif','image/heic','image/heif']
WHERE id = 'business-images';
