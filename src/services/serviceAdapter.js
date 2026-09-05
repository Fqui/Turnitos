// Service adapter that switches between Supabase and Mock service
// based on the environment (production demo vs development)

import supabaseService from './supabaseService';
import mockService from './mockService';

class ServiceAdapter {
    constructor() {
        // Determine which service to use
        this.isDemoMode = this._checkDemoMode();
        this.service = this.isDemoMode ? mockService : supabaseService;

        if (this.isDemoMode) {
            console.info('🎭 Running in DEMO MODE - using mock data');
        } else {
            console.info('🔌 Running in PRODUCTION MODE - using Supabase');
        }
    }

    _checkDemoMode() {
        if (import.meta.env.VITE_DEMO_MODE === 'false') return false;
        if (import.meta.env.VITE_DEMO_MODE === 'true') return true;

        const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
        // Only default to demo mode on GitHub Pages. Localhost should use Supabase if configured.
        return isGitHubPages;
    }
    // --- Proxy all methods to the active service ---

    async getBusinesses() {
        return this.service.getBusinesses();
    }

    async getNearbyBusinesses(lat, lng, radius) {
        if (this.isDemoMode) {
            // Mock implementation could go here, for now just return all
            console.warn('Geolocation mock not implemented, returning all businesses');
            return this.service.getBusinesses();
        }
        return this.service.getNearbyBusinesses(lat, lng, radius);
    }

    async getBusinessById(id) {
        return this.service.getBusinessById(id);
    }

    async login(email, password) {
        return this.service.login(email, password);
    }

    async getBusinessBySlug(slug) {
        return this.service.getBusinessBySlug(slug);
    }

    async createBusiness(businessData) {
        if (this.isDemoMode) {
            throw new Error('Creating businesses is not available in demo mode');
        }
        return this.service.createBusiness(businessData);
    }

    async patchBusiness(id, updates) {
        return this.service.patchBusiness(id, updates);
    }

    async updateBusiness(businessId, businessData) {
        return this.service.updateBusiness(businessId, businessData);
    }

    async getBookings(businessId, date = null) {
        return this.service.getBookings(businessId, date);
    }

    async createBooking(bookingData) {
        return this.service.createBooking(bookingData);
    }

    async updateBookingStatus(id, status, metadata = {}) {
        return this.service.updateBookingStatus(id, status, metadata);
    }

    async updateBooking(id, updates = {}) {
        return this.service.updateBooking(id, updates);
    }

    async moveBooking(id, newDate, newTime, newItemId) {
        return this.service.moveBooking(id, newDate, newTime, newItemId);
    }

    async cancelBooking(id, reason = '') {
        return this.service.cancelBooking(id, reason);
    }

    async deleteBooking(id) {
        return this.service.deleteBooking(id);
    }

    async getPromotions() {
        return this.service.getPromotions();
    }

    async getPromotionById(promoId) {
        return this.service.getPromotionById(promoId);
    }

    async createPromotion(promotionData) {
        if (this.isDemoMode) {
            throw new Error('Creating promotions is not available in demo mode');
        }
        return this.service.createPromotion(promotionData);
    }

    async deletePromotion(promotionId) {
        if (this.isDemoMode) {
            throw new Error('Deleting promotions is not available in demo mode');
        }
        return this.service.deletePromotion(promotionId);
    }

    async getCustomers(businessId) {
        return this.service.getCustomers(businessId);
    }

    async updateCustomer(customerId, customerData) {
        return this.service.updateCustomer(customerId, customerData);
    }

    async getCustomerBookings(businessId, customerPhone) {
        return this.service.getCustomerBookings(businessId, customerPhone);
    }

    getPublicUrl(path) {
        return this.service.getPublicUrl(path);
    }

    async uploadImage(file) {
        if (this.isDemoMode) {
            throw new Error('Image upload is not available in demo mode');
        }
        return this.service.uploadImage(file);
    }

    async getSubscription(businessId) {
        if (this.isDemoMode) {
            // Return mock subscription for demo mode
            return {
                plan_name: 'basic',
                spaces_included: 2,
                spaces_used: 0,
                monthly_price: 5000,
                status: 'active'
            };
        }
        return this.service.getSubscription(businessId);
    }

    async getSubscriptionPlans(businessType) {
        if (this.isDemoMode) {
            // Return mock plans for demo mode
            return [
                { id: 'basic', name: 'Básico', spaces: 2, monthly_price: 5000 },
                { id: 'pro', name: 'Profesional', spaces: 5, monthly_price: 12000 },
                { id: 'premium', name: 'Premium', spaces: 10, monthly_price: 20000 }
            ];
        }
        return this.service.getSubscriptionPlans(businessType);
    }

    async getCategories(businessType = null) {
        if (this.isDemoMode) {
            // Mock categories if needed, or import from mockData
            return import('../data/mockData').then(m => m.categories);
        }
        return this.service.getCategories(businessType);
    }

    subscribeToBookings(businessId, callback) {
        return this.service.subscribeToBookings(businessId, callback);
    }

    subscribeToBusiness(businessId, callback) {
        if (this.isDemoMode || !this.service.subscribeToBusiness) return { unsubscribe: () => {} };
        return this.service.subscribeToBusiness(businessId, callback);
    }

    // Utility method to check if in demo mode
    isDemo() {
        return this.isDemoMode;
    }

    // --- Specialist Methods ---

    async getQualifiedSpecialists(serviceId, businessId = null) {
        if (this.isDemoMode) return [];
        return this.service.getQualifiedSpecialists(serviceId, businessId);
    }

    async getSpecialistBookings(specialistId, date) {
        if (this.isDemoMode) return [];
        return this.service.getSpecialistBookings(specialistId, date);
    }

    async updateServiceSpecialists(serviceId, specialistIds) {
        if (this.isDemoMode) {
            console.warn('updateServiceSpecialists not implemented in demo mode');
            return true;
        }
        return this.service.updateServiceSpecialists(serviceId, specialistIds);
    }

    async getAvailableSpecialists(serviceId, date, time, duration, businessId = null) {
        if (this.isDemoMode) {
            return this.getQualifiedSpecialists(serviceId, businessId);
        }
        if (this.service.getAvailableSpecialists) {
            return this.service.getAvailableSpecialists(serviceId, date, time, duration, businessId);
        }
        return [];
    }

    // --- Image Upload Methods ---

    async uploadBusinessGalleryImage(businessId, file) {
        if (this.isDemoMode) throw new Error('Not available in demo mode');
        // Check if method exists in service, otherwise rely on uploadImage generic
        if (this.service.uploadBusinessGalleryImage) {
            return this.service.uploadBusinessGalleryImage(businessId, file);
        }
        return this.service.uploadImage(file);
    }

    async uploadBusinessLogo(businessId, file) {
        if (this.isDemoMode) throw new Error('Not available in demo mode');
        if (this.service.uploadBusinessLogo) {
            return this.service.uploadBusinessLogo(businessId, file);
        }
        return this.service.uploadImage(file);
    }

    // --- Store Product Methods ---

    async getStoreProducts(businessId, onlyActive = false) {
        if (this.service.getStoreProducts) {
            return this.service.getStoreProducts(businessId, onlyActive);
        }
        return [];
    }

    async createStoreProduct(productData) {
        if (this.service.createStoreProduct) {
            return this.service.createStoreProduct(productData);
        }
        throw new Error('createStoreProduct not supported');
    }

    async updateStoreProduct(id, productData) {
        if (this.service.updateStoreProduct) {
            return this.service.updateStoreProduct(id, productData);
        }
        throw new Error('updateStoreProduct not supported');
    }

    async deleteStoreProduct(id) {
        if (this.service.deleteStoreProduct) {
            return this.service.deleteStoreProduct(id);
        }
        throw new Error('deleteStoreProduct not supported');
    }

    // --- Reviews Methods ---

    async generateReviewToken(booking) {
        if (this.service.generateReviewToken) {
            return this.service.generateReviewToken(booking);
        }
        return 'rev_' + Date.now();
    }

    async getReviewInfoByToken(token) {
        if (this.service.getReviewInfoByToken) {
            return this.service.getReviewInfoByToken(token);
        }
        return { success: false, error: 'No implementado' };
    }

    async submitReviewByToken(token, data) {
        if (this.service.submitReviewByToken) {
            return this.service.submitReviewByToken(token, data);
        }
        throw new Error('submitReviewByToken not supported');
    }

    async getReviewsByBusinessId(businessId) {
        if (this.service.getReviewsByBusinessId) {
            return this.service.getReviewsByBusinessId(businessId);
        }
        return { reviews: [], rating_avg: 5.0, reviews_count: 0 };
    }

    async getAllReviewsForSuperAdmin() {
        if (this.service.getAllReviewsForSuperAdmin) {
            return this.service.getAllReviewsForSuperAdmin();
        }
        return [];
    }

    async deleteOrModerateReview(reviewId, status) {
        if (this.service.deleteOrModerateReview) {
            return this.service.deleteOrModerateReview(reviewId, status);
        }
        return true;
    }
}

// Export singleton instance
const serviceAdapter = new ServiceAdapter();
export default serviceAdapter;

