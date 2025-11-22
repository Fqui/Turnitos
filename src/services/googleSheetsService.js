// Google Sheets Service
// Handles all interactions with Google Sheets via Apps Script Web App

import { GOOGLE_SHEETS_CONFIG } from '../config/googleSheets';

class GoogleSheetsService {
    constructor() {
        this.webAppUrl = GOOGLE_SHEETS_CONFIG.WEB_APP_URL;
        this.timeout = GOOGLE_SHEETS_CONFIG.TIMEOUT;
        this.maxRetries = GOOGLE_SHEETS_CONFIG.MAX_RETRIES;
        this.retryDelay = GOOGLE_SHEETS_CONFIG.RETRY_DELAY;
    }

    /**
     * Make a request to Google Sheets with retry logic
     */
    /**
     * Make a request to Google Sheets with retry logic
     */
    async makeRequest(data, retryCount = 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            // We use POST for everything to avoid caching issues and simplify Apps Script
            // We remove 'no-cors' to be able to read the response
            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // Use text/plain to avoid CORS preflight options request which Apps Script doesn't handle well
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Invalid JSON response:', text);
                throw new Error('Invalid JSON response from server');
            }

        } catch (error) {
            console.error(`Request failed (attempt ${retryCount + 1}):`, error);

            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                console.warn('⚠️ POSIBLE ERROR DE CORS O DEPLOYMENT:');
                console.warn('1. Asegúrate de que el script de Google Apps esté desplegado como "Web App".');
                console.warn('2. Asegúrate de que "Who has access" (Quién tiene acceso) esté en "Anyone" (Cualquiera).');
                console.warn('3. Si acabas de actualizar el código, debes crear una "New Deployment" (Nueva implementación).');
            }

            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`Retrying in ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay);
                return this.makeRequest(data, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Submit a booking to Google Sheets
     */
    async submitBooking(bookingData) {
        const {
            businessName,
            businessId,
            serviceName,
            date,
            time,
            price,
            customerName,
            customerEmail,
            customerPhone,
            status // Get status from input
        } = bookingData;

        const data = {
            action: 'addBooking',
            booking: {
                timestamp: new Date().toISOString(),
                businessName: businessName || 'N/A',
                businessId: businessId || 'N/A',
                service: serviceName || 'N/A',
                date: date || 'N/A',
                time: time || 'N/A',
                price: price || 0,
                customerName: customerName || 'Cliente',
                customerEmail: customerEmail || 'N/A',
                customerPhone: customerPhone || 'N/A',
                status: status || 'confirmed' // Use provided status or default to confirmed
            }
        };

        return await this.makeRequest(data);
    }

    /**
     * Get all bookings
     */
    async getBookings() {
        const data = {
            action: 'getBookings'
        };
        return await this.makeRequest(data);
    }

    /**
     * Cancel a booking
     */
    async cancelBooking(timestamp, businessId) {
        const data = {
            action: 'cancelBooking',
            timestamp: timestamp,
            businessId: businessId
        };
        return await this.makeRequest(data);
    }

    /**
     * Helper: Delay function for retries
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if service is configured
     */
    isConfigured() {
        return this.webAppUrl && this.webAppUrl !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
    }
}

// Export singleton instance
export default new GoogleSheetsService();
