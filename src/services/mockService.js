// Mock service for demo mode (GitHub Pages)
// This service mimics the Supabase API using local JSON data

import { businesses as mockBusinesses } from '../data/mockData';
import { generateSlug } from '../utils/utils';

class MockService {
    constructor() {
        this.businesses = mockBusinesses || [];
        this.bookings = []; // Simulated bookings (in-memory for demo)
        this.customers = [
            { id: 'c1', business_id: 'b1', name: 'Juan Perez', phone: '1122334455', notes: 'Prefiere cancha 1', tags: ['vip'], created_at: new Date().toISOString() },
            { id: 'c2', business_id: 'b1', name: 'Maria Garcia', phone: '1166778899', notes: '', tags: [], created_at: new Date().toISOString() }
        ];
    }

    async uploadImage(file) {
        // Mock image upload
        await this.delay(500);
        return {
            path: 'mock/image.jpg',
            fullPath: 'https://via.placeholder.com/800x400'
        };
    }

    subscribeToBookings(businessId, callback) {
        // No-op for mock service
        return {
            unsubscribe: () => { }
        };
    }

    subscribeToBusiness(businessId, callback) {
        // No-op for mock service
        return {
            unsubscribe: () => { }
        };
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
        const cleanSlug = (slug || '').toLowerCase().trim();
        const business = this.businesses.find(b =>
            (b.slug && b.slug.toLowerCase() === cleanSlug) ||
            (b.id && b.id.toLowerCase() === cleanSlug) ||
            generateSlug(b.name) === cleanSlug ||
            (b.slug && (cleanSlug.includes(b.slug.toLowerCase()) || b.slug.toLowerCase().includes(cleanSlug))) ||
            (b.name && cleanSlug.includes(b.name.toLowerCase().replace(/\s+/g, '')))
        );
        if (!business) {
            return this.businesses.find(b => b.type === 'venue' || b.type === 'alquiler') || this.businesses[0];
        }
        return business;
    }

    async login(email, password) {
        await this.delay(500);
        const business = this.businesses.find(b => b.email === email && b.password === password);
        if (business) {
            return business;
        }
        throw new Error('Credenciales inválidas');
    }

    async updateBusiness(businessId, businessData) {
        return this.patchBusiness(businessId, businessData);
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
            customer_name: bookingData.customerName ? bookingData.customerName.toUpperCase() : bookingData.customerName,
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

        // CRM Sync (Mock)
        const customerExists = this.customers.find(c => c.phone === bookingData.customerPhone && c.business_id === bookingData.businessId);
        if (customerExists) {
            customerExists.name = bookingData.customerName;
            customerExists.updated_at = new Date().toISOString();
        } else {
            this.customers.push({
                id: `c-${Date.now()}`,
                business_id: bookingData.businessId,
                name: bookingData.customerName,
                phone: bookingData.customerPhone,
                notes: '',
                tags: [],
                created_at: new Date().toISOString()
            });
        }

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

    async updateBooking(id, updates = {}) {
        await this.delay(200);
        const booking = this.bookings.find(b => b.id === id);
        if (!booking) throw new Error('Booking not found');

        Object.assign(booking, updates, {
            updated_at: new Date().toISOString()
        });

        // Also update camelCase / snake_case equivalents
        if (updates.guest_count !== undefined) booking.guestCount = updates.guest_count;
        if (updates.guestCount !== undefined) booking.guest_count = updates.guestCount;
        if (updates.price !== undefined) booking.totalPrice = updates.price;
        if (updates.totalPrice !== undefined) booking.price = updates.totalPrice;
        if (updates.deposit_amount !== undefined) booking.depositAmount = updates.deposit_amount;
        if (updates.depositAmount !== undefined) booking.deposit_amount = updates.depositAmount;
        if (updates.selected_services !== undefined) booking.selectedServices = updates.selected_services;
        if (updates.selectedServices !== undefined) booking.selected_services = updates.selectedServices;

        return booking;
    }

    async moveBooking(id, newDate, newTime, newItemId) {
        await this.delay(300);
        const booking = this.bookings.find(b => b.id === id);
        if (!booking) throw new Error('Booking not found');

        booking.date = newDate;
        booking.time = newTime;

        if (booking.court_id) {
            booking.court_id = newItemId;
            booking.resource_id = newItemId;
        } else if (booking.service_id) {
            booking.service_id = newItemId;
            booking.resource_id = newItemId;
        }

        booking.updated_at = new Date().toISOString();
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

    // --- Customers (CRM) ---

    async getCustomers(businessId) {
        await this.delay(300);
        return this.customers.filter(c => c.business_id === businessId);
    }

    async updateCustomer(customerId, customerData) {
        await this.delay(300);
        const index = this.customers.findIndex(c => c.id === customerId);
        if (index === -1) throw new Error('Customer not found');

        this.customers[index] = {
            ...this.customers[index],
            ...customerData,
            name: customerData.name ? customerData.name.toUpperCase() : (customerData.name || this.customers[index].name),
            updated_at: new Date().toISOString()
        };
        return this.customers[index];
    }

    async getCustomerBookings(businessId, customerPhone) {
        await this.delay(300);
        return this.bookings
            .filter(b => b.business_id === businessId && b.customer_phone === customerPhone)
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateB - dateA;
            });
    }

    async patchBusiness(id, updates = {}) {
        await this.delay(150);
        let biz = this.businesses?.find(b => String(b.id) === String(id) || b.slug === id);
        if (biz) {
            Object.assign(biz, updates);
        }
        try {
            const raw = localStorage.getItem('business');
            if (raw) {
                const current = JSON.parse(raw);
                if (String(current.id) === String(id) || current.slug === id) {
                    localStorage.setItem('business', JSON.stringify({ ...current, ...updates }));
                }
            }
        } catch (e) { }
        return biz || { id, ...updates };
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
