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
        // Demo mode is enabled if:
        // 1. We're on GitHub Pages (domain contains github.io)
        // 2. Or explicitly set via environment variable
        const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
        const isDemoEnv = import.meta.env.VITE_DEMO_MODE === 'true';

        return isGitHubPages || isDemoEnv;
    }

    // --- Proxy all methods to the active service ---

    async getBusinesses() {
        return this.service.getBusinesses();
    }

    async getBusinessById(id) {
        return this.service.getBusinessById(id);
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

    async updateBusiness(businessId, businessData) {
        if (this.isDemoMode) {
            throw new Error('Updating businesses is not available in demo mode');
        }
        return this.service.updateBusiness(businessId, businessData);
    }

    async getBookings(businessId, date = null) {
        return this.service.getBookings(businessId, date);
    }

    async createBooking(bookingData) {
        return this.service.createBooking(bookingData);
    }

    async updateBookingStatus(id, status) {
        return this.service.updateBookingStatus(id, status);
    }

    async cancelBooking(id) {
        return this.service.cancelBooking(id);
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

    getPublicUrl(path) {
        return this.service.getPublicUrl(path);
    }

    async uploadImage(file) {
        if (this.isDemoMode) {
            throw new Error('Image upload is not available in demo mode');
        }
        return this.service.uploadImage(file);
    }

    // Utility method to check if in demo mode
    isDemo() {
        return this.isDemoMode;
    }
}

// Export singleton instance
const serviceAdapter = new ServiceAdapter();
export default serviceAdapter;
