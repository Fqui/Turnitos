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

    async login(businessId, password) {
        await this.delay(500);
        const business = this.businesses.find(b => b.id === businessId);
        if (business && business.password === password) {
            return business;
        }
        throw new Error('Credenciales inválidas');
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

        // Sort by most recently created first
        const sortedBookings = bookingsWithResourceId.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
            const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
            return dateB - dateA;
        });

        return { bookings: sortedBookings };
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
            status: bookingData.status || 'pending',
            price: bookingData.price,
            created_at: new Date().toISOString(),
            history: [
                {
                    action: 'creation',
                    label: 'Turno Creado',
                    timestamp: new Date().toISOString(),
                    status: bookingData.status || 'pending'
                }
            ]
        };

        this.bookings.push(newBooking);

        // Show a notification that this is demo mode
        console.info('📝 Demo Mode: Booking created (will reset on page refresh):', newBooking);

        return newBooking;
    }

    async updateBookingStatus(id, status, metadata = {}) {
        await this.delay(200);

        const booking = this.bookings.find(b => b.id === id);
        if (!booking) {
            throw new Error('Booking not found');
        }

        booking.status = status;
        booking.updated_at = new Date().toISOString();

        if (status === 'confirmed') booking.confirmed_at = new Date().toISOString();
        if (status === 'cancelled') {
            booking.cancelled_at = new Date().toISOString();
            booking.cancellation_reason = metadata.reason || 'Cancelado por el administrador';
        }
        if (status === 'deposit_paid') booking.deposit_paid_at = new Date().toISOString();
        if (status === 'completed') booking.completed_at = new Date().toISOString();

        // Update history
        if (!booking.history) booking.history = [];

        let actionLabel = 'Estado Actualizado';
        if (status === 'confirmed') actionLabel = 'Turno Confirmado';
        if (status === 'cancelled') actionLabel = 'Turno Cancelado';
        if (status === 'deposit_paid') actionLabel = 'Seña Confirmada';
        if (status === 'completed') actionLabel = 'Servicio Finalizado';
        if (metadata.action === 'attendance_confirmed') actionLabel = 'Asistencia Confirmada';

        booking.history.push({
            action: metadata.action || 'status_update',
            label: actionLabel,
            timestamp: new Date().toISOString(),
            status: status,
            reason: metadata.reason
        });

        return booking;
    }

    async cancelBooking(id, reason = '') {
        return this.updateBookingStatus(id, 'cancelled', { reason });
    }

    async deleteBooking(id) {
        await this.delay(200);
        this.bookings = this.bookings.filter(b => b.id !== id);
        return true;
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
