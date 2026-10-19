-- Aplicada en producción el 2026-10-19.
-- Permite subir videos (historias y destacadas) al bucket business-images.
-- Límite 50 MB (el máximo del plan gratis de Supabase); el panel limita fotos a 10 MB y videos a 50 MB.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/avif','image/gif','image/heic','image/heif',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'business-images';
