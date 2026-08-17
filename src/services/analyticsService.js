import { supabase } from './supabaseClient';

/**
 * Normaliza cualquier formato de fecha (YYYY-MM-DD o DD/MM/YYYY) a YYYY-MM-DD
 */
function normalizeDate(rawDate) {
    if (!rawDate) return '';
    const str = String(rawDate).trim().split('T')[0];
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${y}-${m}-${d}`;
        }
    }
    return str;
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM para mostrar en gráficos
 */
function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
}

/**
 * Analytics Service
 * Provides metrics and KPIs for businesses, courts, venues, and admin panel
 */
class AnalyticsService {
    /**
     * Compute full analytics directly from preloaded bookings array
     * @param {Array} bookings - Array of booking objects
     * @param {Object} dateRange - { preset, start, end }
     * @returns {Object} { metrics, trends, peakHours, customerInsights }
     */
    computeAnalyticsFromBookings(bookings = [], dateRange = null) {
        const allBookings = Array.isArray(bookings) ? bookings : [];

        // 1. Filtrar bloqueos y normalizar fechas
        const nonBlocked = allBookings
            .filter(b => 
                b.status !== 'blocked' && 
                !b.customer_name?.toUpperCase().includes('BLOQUEADO') &&
                !b.customerName?.toUpperCase().includes('BLOQUEADO') &&
                !b.notes?.toUpperCase().includes('BLOQUEO')
            )
            .map(b => ({
                ...b,
                _normalizedDate: normalizeDate(b.date || b.start_time || b.created_at)
            }));

        // 2. Filtrar por rango de fechas si aplica
        const filteredBookings = nonBlocked.filter(b => {
            if (!dateRange || dateRange.preset === 'all' || (!dateRange.start && !dateRange.end)) {
                return true;
            }
            const bDate = b._normalizedDate;
            if (!bDate) return true;

            const startStr = normalizeDate(dateRange.start);
            const endStr = normalizeDate(dateRange.end);

            if (startStr && bDate < startStr) return false;
            if (endStr && bDate > endStr) return false;
            return true;
        });

        // 3. Métricas Principales
        const ACTIVE_STATES = ['confirmed', 'attended', 'completed', 'deposit_paid'];
        const activeBookings = filteredBookings.filter(b => ACTIVE_STATES.includes(b.status));

        const totalBookings = activeBookings.length;
        const completedBookings = filteredBookings.filter(b => b.status === 'completed' || b.status === 'attended').length;
        const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
        const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;

        // Facturación activa total
        const totalRevenue = activeBookings.reduce((sum, b) => {
            const val = Number(b.price ?? b.total_price ?? b.totalPrice ?? 0);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        // Ingresos cobrados
        const collectedRevenue = filteredBookings
            .filter(b => b.status === 'completed' || b.status === 'attended')
            .reduce((sum, b) => {
                const val = Number(b.price ?? b.total_price ?? b.totalPrice ?? 0);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);

        // Total señas cobradas
        const totalDeposits = activeBookings.reduce((sum, b) => {
            const dep = Number(b.deposit_amount ?? b.depositAmount ?? b.metadata?.deposit_amount ?? b.metadata?.depositAmount ?? 0);
            return sum + (isNaN(dep) ? 0 : dep);
        }, 0);

        // Ticket promedio
        const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

        // Tasa de efectividad
        const totalAttempts = totalBookings + cancelledBookings;
        const completionRate = totalAttempts > 0 ? (totalBookings / totalAttempts) * 100 : (totalBookings > 0 ? 100 : 0);

        // 4. Rendimiento por Cancha
        const courtMap = {};
        activeBookings.forEach(b => {
            const name = b.courts?.name || b.court_name || b.resource_name || b.resourceName || b.services?.name || b.service_name || 'Cancha Principal';
            if (!courtMap[name]) {
                courtMap[name] = { name, count: 0, revenue: 0 };
            }
            courtMap[name].count += 1;
            courtMap[name].revenue += Number(b.price ?? b.total_price ?? b.totalPrice ?? 0) || 0;
        });

        const courtsBreakdown = Object.values(courtMap)
            .map(c => ({
                ...c,
                percentage: totalBookings > 0 ? Math.round((c.count / totalBookings) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        // 5. Desglose de Adicionales Vendidos
        const additionalsMap = {};
        activeBookings.forEach(b => {
            const rawServices = b.selected_services || b.selectedServices || b.additional_services || b.metadata?.selectedServices || [];
            if (Array.isArray(rawServices)) {
                rawServices.forEach(item => {
                    let name = '';
                    let price = 0;
                    let qty = 1;

                    if (typeof item === 'object' && item !== null) {
                        name = item.name || item.label || item.title || 'Adicional';
                        price = Number(item.price || 0);
                        qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                    } else if (typeof item === 'string' && item.trim()) {
                        name = item.trim();
                    }

                    if (name) {
                        if (!additionalsMap[name]) {
                            additionalsMap[name] = { name, quantity: 0, revenue: 0 };
                        }
                        additionalsMap[name].quantity += qty;
                        additionalsMap[name].revenue += (price * qty);
                    }
                });
            }
        });

        const additionalsBreakdown = Object.values(additionalsMap).sort((a, b) => b.quantity - a.quantity);

        // 6. Top Clientes
        const customerMap = {};
        activeBookings.forEach(b => {
            const phone = b.customer_phone || b.customerPhone || '';
            const name = b.customer_name || b.customerName || 'Cliente';
            const key = phone || name;

            if (key && key !== 'Cliente') {
                if (!customerMap[key]) {
                    customerMap[key] = {
                        name,
                        phone,
                        bookingsCount: 0,
                        totalSpent: 0,
                        lastDate: b._normalizedDate
                    };
                }
                customerMap[key].bookingsCount += 1;
                customerMap[key].totalSpent += Number(b.price ?? b.total_price ?? b.totalPrice ?? 0) || 0;
                if (b._normalizedDate > customerMap[key].lastDate) {
                    customerMap[key].lastDate = b._normalizedDate;
                }
            }
        });

        const topCustomers = Object.values(customerMap)
            .sort((a, b) => b.bookingsCount - a.bookingsCount || b.totalSpent - a.totalSpent)
            .slice(0, 5);

        // 7. Gráficos de Tendencias Continuos (Timeline)
        // Mapeamos reservas por fecha normalizada
        const dateTrendsMap = {};
        activeBookings.forEach(b => {
            const d = b._normalizedDate;
            if (!d) return;

            if (!dateTrendsMap[d]) {
                dateTrendsMap[d] = { count: 0, revenue: 0 };
            }
            dateTrendsMap[d].count += 1;
            dateTrendsMap[d].revenue += Number(b.price ?? b.total_price ?? b.totalPrice ?? 0) || 0;
        });

        // Generar rango de días continuo para que la gráfica siempre sea fluida
        const recordedDates = Object.keys(dateTrendsMap).sort();
        let timelineStart = '';
        let timelineEnd = '';

        if (dateRange && dateRange.start && dateRange.end) {
            timelineStart = normalizeDate(dateRange.start);
            timelineEnd = normalizeDate(dateRange.end);
        } else if (recordedDates.length > 0) {
            // Desde 3 días antes de la primera reserva hasta 3 días después de la última
            const minD = new Date(recordedDates[0] + 'T00:00:00');
            minD.setDate(minD.getDate() - 2);
            timelineStart = minD.toISOString().split('T')[0];

            const maxD = new Date(recordedDates[recordedDates.length - 1] + 'T00:00:00');
            maxD.setDate(maxD.getDate() + 2);
            timelineEnd = maxD.toISOString().split('T')[0];
        } else {
            const now = new Date();
            const past7 = new Date();
            past7.setDate(now.getDate() - 6);
            timelineStart = past7.toISOString().split('T')[0];
            timelineEnd = now.toISOString().split('T')[0];
        }

        const trends = [];
        if (timelineStart && timelineEnd) {
            const cur = new Date(timelineStart + 'T00:00:00');
            const end = new Date(timelineEnd + 'T00:00:00');
            let safetyLimit = 0;

            while (cur <= end && safetyLimit < 120) {
                const curStr = cur.toISOString().split('T')[0];
                const dayData = dateTrendsMap[curStr] || { count: 0, revenue: 0 };
                trends.push({
                    date: formatDisplayDate(curStr),
                    rawDate: curStr,
                    bookings: dayData.count,
                    revenue: dayData.revenue
                });
                cur.setDate(cur.getDate() + 1);
                safetyLimit++;
            }
        }

        // 8. Mapa de Calor de Horas Pico (7 días x 24 hs)
        const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
        activeBookings.forEach(booking => {
            if (!booking._normalizedDate || !booking.time) return;

            const parts = booking._normalizedDate.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const d = new Date(year, month, day);
                const dayOfWeek = d.getDay();

                const hour = parseInt(String(booking.time).split(':')[0], 10);

                if (dayOfWeek >= 0 && dayOfWeek <= 6 && hour >= 0 && hour <= 23) {
                    heatmap[dayOfWeek][hour]++;
                }
            }
        });

        const peakHours = {
            data: heatmap,
            labels: {
                days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
                hours: Array.from({ length: 24 }, (_, i) => `${i}:00`)
            }
        };

        // 9. Customer Insights
        const totalUniqueCustomers = Object.keys(customerMap).length;
        const returningCustomers = Object.values(customerMap).filter(c => c.bookingsCount > 1).length;
        const newCustomers = totalUniqueCustomers - returningCustomers;
        const retentionRate = totalUniqueCustomers > 0 ? (returningCustomers / totalUniqueCustomers) * 100 : 0;

        const customerInsights = {
            totalCustomers: totalUniqueCustomers,
            newCustomers,
            returningCustomers,
            retentionRate
        };

        return {
            metrics: {
                totalRevenue,
                collectedRevenue,
                totalDeposits,
                totalBookings,
                completedBookings,
                pendingBookings,
                cancelledBookings,
                avgBookingValue,
                completionRate,
                courtsBreakdown,
                additionalsBreakdown,
                topCustomers
            },
            trends,
            peakHours,
            customerInsights
        };
    }

    async getBusinessMetrics(businessId, dateRange = null) {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('*, services(name), courts(name)')
                .eq('business_id', businessId);
            if (error) throw error;
            return this.computeAnalyticsFromBookings(bookings || [], dateRange).metrics;
        } catch (error) {
            console.error('Error in getBusinessMetrics:', error);
            return null;
        }
    }

    async getBookingTrends(businessId, period = 'daily', dateRange = null) {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('business_id', businessId);
            if (error) throw error;
            return this.computeAnalyticsFromBookings(bookings || [], dateRange).trends;
        } catch (error) {
            console.error('Error in getBookingTrends:', error);
            return [];
        }
    }

    async getPeakHours(businessId, dateRange = null) {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('business_id', businessId);
            if (error) throw error;
            return this.computeAnalyticsFromBookings(bookings || [], dateRange).peakHours;
        } catch (error) {
            console.error('Error in getPeakHours:', error);
            return null;
        }
    }

    async getCustomerInsights(businessId, dateRange = null) {
        try {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('business_id', businessId);
            if (error) throw error;
            return this.computeAnalyticsFromBookings(bookings || [], dateRange).customerInsights;
        } catch (error) {
            console.error('Error in getCustomerInsights:', error);
            return null;
        }
    }
}

export default new AnalyticsService();
