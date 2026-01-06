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

    async getBusinessById(id) {
        return this.service.getBusinessById(id);
    }

    async login(email, password) {
        return this.service.login(email, password);
    }

    async getBusinessBySlug(slug) {
        // MockService has this method, SupabaseService doesn't
        if (this.isDemoMode) {
            return this.service.getBusinessBySlug(slug);
        } else {
            // For Supabase, we need to get all businesses and filter by slug
            const businesses = await this.service.getBusinesses();
            const { generateSlug } = await import('../utils/utils');
            return businesses.find(b => generateSlug(b.name) === slug);
        }
    }

    async createBusiness(businessData) {
        if (this.isDemoMode) {
            throw new Error('Creating businesses is not available in demo mode');
        }
        return this.service.createBusiness(businessData);
    }

    async patchBusiness(id, updates) {
        if (this.isDemoMode) {
            // Mock implementation for demo mode if needed, or throw error
            console.warn('patchBusiness not fully implemented in mock service, falling back to updateBusiness mock');
            // In mock service, updateBusiness typically handles full replacement, but we can try merging
            const current = await this.service.getBusinessById(id);
            return this.service.updateBusiness(id, { ...current, ...updates });
        }
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

    subscribeToBookings(businessId, callback) {
        return this.service.subscribeToBookings(businessId, callback);
    }

    // Utility method to check if in demo mode
    isDemo() {
        return this.isDemoMode;
    }
}

// Export singleton instance
const serviceAdapter = new ServiceAdapter();
export default serviceAdapter;
