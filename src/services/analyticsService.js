import { supabase } from './supabaseClient';

/**
 * Analytics Service
 * Provides metrics and KPIs for businesses and admin panel
 */

class AnalyticsService {
    /**
     * Get comprehensive metrics for a specific business
     * @param {string} businessId - Business ID
     * @param {Object} dateRange - { start: Date, end: Date }
     * @returns {Object} Business metrics
     */
    async getBusinessMetrics(businessId, dateRange = null) {
        try {
            const { start, end } = this._getDateRange(dateRange);

            // Get all bookings for the business in date range
            let query = supabase
                .from('bookings')
                .select('*, services(name, price)')
                .eq('business_id', businessId);

            if (start && end) {
                query = query.gte('date', start).lte('date', end);
            }

            const { data: bookings, error } = await query;
            if (error) throw error;

            // Calculate metrics
            const totalBookings = bookings.length;
            const totalRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
            const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

            // Calculate completion rate (confirmed vs cancelled)
            const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
            const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
            const completionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

            // Get previous period for comparison
            const previousPeriod = this._getPreviousPeriod(start, end);
            const previousMetrics = await this._getBasicMetrics(businessId, previousPeriod);

            return {
                totalRevenue,
                totalBookings,
                avgBookingValue,
                completionRate,
                cancelledBookings,
                growth: {
                    revenue: this._calculateGrowth(totalRevenue, previousMetrics.revenue),
                    bookings: this._calculateGrowth(totalBookings, previousMetrics.bookings)
                }
            };
        } catch (error) {
            console.error('Error fetching business metrics:', error);
            throw error;
        }
    }

    /**
     * Get booking trends over time
     * @param {string} businessId - Business ID
     * @param {string} period - 'daily', 'weekly', 'monthly'
     * @param {number} days - Number of days to look back
     * @returns {Array} Trend data
     */
    async getBookingTrends(businessId, period = 'daily', days = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('date, price, status')
                .eq('business_id', businessId)
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (error) throw error;

            // Group by period
            const grouped = this._groupByPeriod(bookings, period);

            return grouped.map(item => ({
                date: item.date,
                bookings: item.count,
                revenue: item.revenue
            }));
        } catch (error) {
            console.error('Error fetching booking trends:', error);
            throw error;
        }
    }

    /**
     * Get peak hours analysis
     * @param {string} businessId - Business ID
     * @returns {Object} Heatmap data
     */
    async getPeakHours(businessId) {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('date, time')
                .eq('business_id', businessId)
                .eq('status', 'confirmed');

            if (error) throw error;

            // Create heatmap: days of week x hours
            const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));

            bookings.forEach(booking => {
                const date = new Date(booking.date);
                const dayOfWeek = date.getDay(); // 0 = Sunday
                const hour = parseInt(booking.time.split(':')[0]);

                heatmap[dayOfWeek][hour]++;
            });

            return {
                data: heatmap,
                labels: {
                    days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
                    hours: Array.from({ length: 24 }, (_, i) => `${i}:00`)
                }
            };
        } catch (error) {
            console.error('Error fetching peak hours:', error);
            throw error;
        }
    }

    /**
     * Get customer insights
     * @param {string} businessId - Business ID
     * @returns {Object} Customer metrics
     */
    async getCustomerInsights(businessId) {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('customer_name, customer_phone, date, services(name)')
                .eq('business_id', businessId)
                .eq('status', 'confirmed');

            if (error) throw error;

            // Track unique customers by phone
            const customerMap = new Map();

            bookings.forEach(booking => {
                const key = booking.customer_phone;
                if (!customerMap.has(key)) {
                    customerMap.set(key, {
                        name: booking.customer_name,
                        bookings: 0,
                        firstVisit: booking.date,
                        lastVisit: booking.date
                    });
                }

                const customer = customerMap.get(key);
                customer.bookings++;
                if (booking.date < customer.firstVisit) customer.firstVisit = booking.date;
                if (booking.date > customer.lastVisit) customer.lastVisit = booking.date;
            });

            const totalCustomers = customerMap.size;
            const returningCustomers = Array.from(customerMap.values()).filter(c => c.bookings > 1).length;
            const newCustomers = totalCustomers - returningCustomers;
            const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

            // Top services
            const serviceCount = {};
            bookings.forEach(booking => {
                const serviceName = booking.services?.name || 'Unknown';
                serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
            });

            const topServices = Object.entries(serviceCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            return {
                totalCustomers,
                newCustomers,
                returningCustomers,
                retentionRate,
                topServices
            };
        } catch (error) {
            console.error('Error fetching customer insights:', error);
            throw error;
        }
    }

    /**
     * Get platform-wide metrics (Admin only)
     * @returns {Object} Platform metrics
     */
    async getAdminMetrics() {
        try {
            // Get all businesses
            const { data: businesses, error: bizError } = await supabase
                .from('businesses')
                .select('id, name, type, created_at');

            if (bizError) throw bizError;

            // Get all bookings
            const { data: bookings, error: bookError } = await supabase
                .from('bookings')
                .select('business_id, price, status, created_at');

            if (bookError) throw bookError;

            const totalBusinesses = businesses.length;
            const totalBookings = bookings.length;
            const totalRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

            // New businesses this month
            const thisMonth = new Date();
            thisMonth.setDate(1);
            const newBusinesses = businesses.filter(b =>
                new Date(b.created_at) >= thisMonth
            ).length;

            // Category breakdown
            const sportBusinesses = businesses.filter(b => b.type === 'sport').length;
            const serviceBusinesses = businesses.filter(b => b.type === 'service').length;

            return {
                totalBusinesses,
                totalBookings,
                totalRevenue,
                newBusinesses,
                categoryBreakdown: {
                    sport: sportBusinesses,
                    service: serviceBusinesses
                }
            };
        } catch (error) {
            console.error('Error fetching admin metrics:', error);
            throw error;
        }
    }

    /**
     * Get business performance comparison (Admin only)
     * @returns {Array} Business leaderboard
     */
    async getBusinessComparison() {
        try {
            const { data: businesses, error: bizError } = await supabase
                .from('businesses')
                .select('id, name, type');

            if (bizError) throw bizError;

            const { data: bookings, error: bookError } = await supabase
                .from('bookings')
                .select('business_id, price, status');

            if (bookError) throw bookError;

            // Calculate metrics per business
            const businessMetrics = businesses.map(business => {
                const bizBookings = bookings.filter(b => b.business_id === business.id);
                const revenue = bizBookings.reduce((sum, b) => sum + (b.price || 0), 0);

                return {
                    id: business.id,
                    name: business.name,
                    type: business.type,
                    totalBookings: bizBookings.length,
                    revenue
                };
            });

            // Sort by revenue
            return businessMetrics.sort((a, b) => b.revenue - a.revenue);
        } catch (error) {
            console.error('Error fetching business comparison:', error);
            throw error;
        }
    }

    // Helper methods

    _getDateRange(dateRange) {
        if (dateRange && dateRange.start && dateRange.end) {
            return {
                start: dateRange.start instanceof Date
                    ? dateRange.start.toISOString().split('T')[0]
                    : dateRange.start,
                end: dateRange.end instanceof Date
                    ? dateRange.end.toISOString().split('T')[0]
                    : dateRange.end
            };
        }

        // Default: last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }

    _getPreviousPeriod(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const duration = endDate - startDate;

        const prevEnd = new Date(startDate);
        prevEnd.setDate(prevEnd.getDate() - 1);

        const prevStart = new Date(prevEnd);
        prevStart.setTime(prevStart.getTime() - duration);

        return {
            start: prevStart.toISOString().split('T')[0],
            end: prevEnd.toISOString().split('T')[0]
        };
    }

    async _getBasicMetrics(businessId, dateRange) {
        const { start, end } = dateRange;

        const { data: bookings } = await supabase
            .from('bookings')
            .select('price')
            .eq('business_id', businessId)
            .gte('date', start)
            .lte('date', end);

        return {
            bookings: bookings?.length || 0,
            revenue: bookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0
        };
    }

    _calculateGrowth(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    _groupByPeriod(bookings, period) {
        const grouped = {};

        bookings.forEach(booking => {
            let key;
            const date = new Date(booking.date);

            if (period === 'daily') {
                key = booking.date;
            } else if (period === 'weekly') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else if (period === 'monthly') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!grouped[key]) {
                grouped[key] = { date: key, count: 0, revenue: 0 };
            }

            grouped[key].count++;
            grouped[key].revenue += booking.price || 0;
        });

        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    }
}

export default new AnalyticsService();
