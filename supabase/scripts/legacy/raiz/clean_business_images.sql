-- Limpiar imágenes que podrían estar causando timeouts por ser base64 pesado
UPDATE businesses 
SET logo = NULL, banner_image = NULL 
WHERE id = '1763872710493';
