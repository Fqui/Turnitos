/**
 * Image Resizing and Optimization Utility
 * Handles automatic resizing of images according to DESIGN_GUIDELINES.md
 */

/**
 * Image specifications based on DESIGN_GUIDELINES.md
 */
export const IMAGE_SPECS = {
    logo: {
        width: 512,
        height: 512,
        aspectRatio: 1, // 1:1
        quality: 0.9,
        maxSizeKB: 100
    },
    banner: {
        width: 1600,
        height: 400,
        aspectRatio: 4, // 4:1
        quality: 0.85,
        maxSizeKB: 300
    },
    promotion: {
        width: 1920,
        height: 1080,
        aspectRatio: 16 / 9, // 16:9
        quality: 0.85,
        maxSizeKB: 500
    }
};

/**
 * Resize and optimize an image file
 * @param {File} file - The image file to resize
 * @param {string} type - Type of image: 'logo', 'banner', or 'promotion'
 * @returns {Promise<File>} - Optimized image file
 */
export async function resizeImage(file, type = 'logo') {
    const spec = IMAGE_SPECS[type];
    if (!spec) {
        throw new Error(`Invalid image type: ${type}`);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                try {
                    // Create canvas with target dimensions
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = spec.width;
                    canvas.height = spec.height;

                    // Calculate dimensions to crop and scale
                    const { sx, sy, sWidth, sHeight } = calculateCropDimensions(
                        img.width,
                        img.height,
                        spec.aspectRatio
                    );

                    // Draw image on canvas (cropped and scaled)
                    ctx.drawImage(
                        img,
                        sx, sy, sWidth, sHeight,  // Source rectangle
                        0, 0, canvas.width, canvas.height  // Destination rectangle
                    );

                    // Convert canvas to blob
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Failed to create blob from canvas'));
                                return;
                            }

                            // Create new file from blob
                            const optimizedFile = new File(
                                [blob],
                                file.name,
                                { type: 'image/jpeg' }
                            );

                            resolve(optimizedFile);
                        },
                        'image/jpeg',
                        spec.quality
                    );
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Calculate crop dimensions to maintain aspect ratio
 * @param {number} imgWidth - Original image width
 * @param {number} imgHeight - Original image height
 * @param {number} targetAspectRatio - Target aspect ratio (width/height)
 * @returns {Object} - Crop dimensions {sx, sy, sWidth, sHeight}
 */
function calculateCropDimensions(imgWidth, imgHeight, targetAspectRatio) {
    const imgAspectRatio = imgWidth / imgHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = imgWidth;
    let sHeight = imgHeight;

    if (imgAspectRatio > targetAspectRatio) {
        // Image is wider than target - crop width
        sWidth = imgHeight * targetAspectRatio;
        sx = (imgWidth - sWidth) / 2;
    } else if (imgAspectRatio < targetAspectRatio) {
        // Image is taller than target - crop height
        sHeight = imgWidth / targetAspectRatio;
        sy = (imgHeight - sHeight) / 2;
    }

    return { sx, sy, sWidth, sHeight };
}

/**
 * Get image dimensions from file
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate image file
 * @param {File} file - Image file to validate
 * @returns {Object} - Validation result {valid: boolean, error: string}
 */
export function validateImageFile(file) {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No se seleccionó ningún archivo' };
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Formato no válido. Use JPG, PNG o WebP'
        };
    }

    // Check file size (max 10MB before processing)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'La imagen es demasiado grande (máximo 10MB)'
        };
    }

    return { valid: true, error: null };
}
