// Product photos and video in metadata.store_products.
// Old products may only have `image`, or an `images` list longer than the current limit
// whose cover (`image`) is not the first one.

export const MAX_PRODUCT_PHOTOS = 5;
export const MAX_PRODUCT_VIDEO_MB = 50;
export const PRODUCT_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export const PRODUCT_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80';

/** Every stored photo, cover first (no limit: the panel warns about the extra ones). */
export function getAllProductPhotos(product) {
    if (!product) return [];
    const list = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    if (!list.length) return product.image ? [product.image] : [];
    const cover = product.image && list.includes(product.image) ? product.image : list[0];
    return [cover, ...list.filter(url => url !== cover)];
}

/** Photos to show (cover first, up to MAX_PRODUCT_PHOTOS). */
export function getProductPhotos(product) {
    return getAllProductPhotos(product).slice(0, MAX_PRODUCT_PHOTOS);
}

/** Video URL, or null when the product has none. */
export function getProductVideo(product) {
    const video = product?.video;
    if (!video) return null;
    return typeof video === 'string' ? video : video.url || null;
}
