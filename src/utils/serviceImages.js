// Helpers for service photos: up to MAX_SERVICE_IMAGES per service.
// image_url stays as the main photo (= images[0]) so cards, search and SEO keep working.

export const MAX_SERVICE_IMAGES = 5;

const cleanList = (list) => [...new Set((list || []).filter(u => typeof u === 'string' && u.trim()))];

// Photos to show for a service; services saved before `images` existed only have image_url.
export function getServiceImages(service) {
    const images = cleanList(service?.images);
    if (images.length > 0) return images.slice(0, MAX_SERVICE_IMAGES);
    const main = service?.image_url || service?.image;
    return main ? [main] : [];
}

// Columns to persist. Forms that don't send `images` only update image_url, so their photos are not wiped.
export function serviceImageColumns(service) {
    const main = service?.image_url || service?.image || null;
    if (!Array.isArray(service?.images)) return { image_url: main };

    let images = cleanList(service.images);
    if (!main) images = [];
    else if (images[0] !== main) images = [main, ...images.filter(u => u !== main)];
    images = images.slice(0, MAX_SERVICE_IMAGES);

    return { image_url: images[0] || null, images };
}
