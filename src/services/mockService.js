// Mock service for demo mode (GitHub Pages)
// This service mimics the Supabase API using local JSON data

import demoData from '../data/demoData.json';
import { generateSlug } from '../utils/utils';

class MockService {
    constructor() {
        this.businesses = demoData.businesses || [];
        this.bookings = []; // Simulated bookings (in-memory for demo)
    }

    // --- Businesses ---

    async getBusinesses() {
        // Simulate API delay
        await this.delay(300);
        return this.businesses;
    }

    async getBusinessById(id) {
        await this.delay(300);
        const business = this.businesses.find(b => b.id === id);
        if (!business) {
            throw new Error('Business not found');
        }
        return business;
    }

    async getBusinessBySlug(slug) {
        await this.delay(300);
        const business = this.businesses.find(b => generateSlug(b.name) === slug);
        if (!business) {
            throw new Error('Business not found');
        }
        return business;
    }

    // --- Bookings ---
    // Note: In demo mode, bookings are stored in memory only
    // They will reset when the page is refreshed

    async getBookings(businessId, date = null) {
        await this.delay(200);

        // Helper to format date in local timezone
        const formatDateLocal = (date) => {
            if (!date) return null;
            if (typeof date === 'string') return date;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let filteredBookings = this.bookings;

        if (businessId) {
            filteredBookings = filteredBookings.filter(b => b.business_id === businessId);
        }

        if (date) {
            const dateStr = formatDateLocal(date);
            filteredBookings = filteredBookings.filter(b => b.date === dateStr);
        }

        // Map court_id or service_id to resource_id for consistent availability checking
        const bookingsWithResourceId = filteredBookings.map(booking => ({
            ...booking,
            resource_id: booking.court_id || booking.service_id
        }));

        return { bookings: bookingsWithResourceId };
    }

    async createBooking(bookingData) {
        await this.delay(300);

        // Helper to format date in local timezone
        const formatDateLocal = (date) => {
            if (!date) return null;
            if (typeof date === 'string') return date;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Create a new booking with a fake ID
        const newBooking = {
            id: `demo-booking-${Date.now()}`,
            business_id: bookingData.businessId,
            service_id: bookingData.serviceId,
            court_id: bookingData.courtId,
            date: formatDateLocal(bookingData.date),
            time: bookingData.time,
            customer_name: bookingData.customerName,
            customer_phone: bookingData.customerPhone,
            status: bookingData.status || 'confirmed',
            price: bookingData.price
        };

        this.bookings.push(newBooking);

        // Show a notification that this is demo mode
        console.info('📝 Demo Mode: Booking created (will reset on page refresh):', newBooking);

        return newBooking;
    }

    async updateBookingStatus(id, status) {
        await this.delay(200);

        const booking = this.bookings.find(b => b.id === id);
        if (!booking) {
            throw new Error('Booking not found');
        }

        booking.status = status;
        return booking;
    }

    async cancelBooking(id) {
        return this.updateBookingStatus(id, 'cancelled');
    }

    // --- Promotions ---
    // Not implemented for demo mode

    async getPromotions() {
        await this.delay(200);
        return [];
    }

    // --- Storage ---
    // Not implemented for demo mode

    getPublicUrl(path) {
        return path; // Return the path as-is
    }

    async uploadImage(file) {
        // In demo mode, we can't upload images
        console.warn('⚠️ Demo Mode: Image upload not available');
        throw new Error('Image upload not available in demo mode');
    }

    // --- Utility ---

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if we're in demo mode
    static isDemoMode() {
        // Demo mode is enabled if:
        // 1. We're on GitHub Pages (domain contains github.io)
        // 2. Or explicitly set via environment variable
        const isGitHubPages = window.location.hostname.includes('github.io');
        const isDemoEnv = import.meta.env.VITE_DEMO_MODE === 'true';

        return isGitHubPages || isDemoEnv;
    }
}

// Export singleton instance
const mockService = new MockService();
export default mockService;
