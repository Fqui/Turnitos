import { getSafeStoreProducts } from '../components/profile/ProfileStorePromoCard';

// Products the customer can actually buy (is_active !== false)
export function getActiveStoreProducts(business) {
    return getSafeStoreProducts(business).filter(p => p && p.is_active !== false);
}

// Single rule for "this business has an online store", shared by the profile, the store page and the bio:
// the owner did not turn it off and there is at least one active product.
export function isStoreAvailable(business) {
    if (!business) return false;
    if (business.store_enabled === false) return false;
    return getActiveStoreProducts(business).length > 0;
}
