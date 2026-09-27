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
    computeAnalyticsFromBookings(bookings = [], dateRange = null, business = null) {
        const allBookings = Array.isArray(bookings) ? bookings : [];

        // Detección de negocio de alquiler / venue
        const isRental = Boolean(
            business?.type === 'venue' ||
            business?.type === 'alquiler' ||
            business?.type === 'rental' ||
            business?.is_rental ||
            (business?.category || '').toLowerCase().includes('alquiler') ||
            (business?.category || '').toLowerCase().includes('quincho') ||
            (business?.category || '').toLowerCase().includes('quinta') ||
            (business?.category || '').toLowerCase().includes('salon') ||
            (business?.category || '').toLowerCase().includes('salón') ||
            (business?.category || '').toLowerCase().includes('evento') ||
            (business?.categories?.name || '').toLowerCase().includes('alquiler') ||
            (business?.categories?.name || '').toLowerCase().includes('quincho') ||
            (business?.slug || '').toLowerCase().includes('quincho') ||
            (business?.slug || '').toLowerCase().includes('roma') ||
            (Array.isArray(bookings) && bookings.some(b => 
                b.guest_count || b.guestCount || b.metadata?.guest_count || b.metadata?.guestCount ||
                b.durationHours || b.duration_hours || b.metadata?.durationHours
            ))
        );

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
        const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed' || b.status === 'deposit_paid').length;
        const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
        const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;

        // Facturación activa total
        const totalRevenue = activeBookings.reduce((sum, b) => {
            const val = Number(b.price ?? b.total_price ?? b.totalPrice ?? 0);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        // Ingresos cobrados (eventos finalizados o atendidos)
        const collectedRevenue = filteredBookings
            .filter(b => b.status === 'completed' || b.status === 'attended')
            .reduce((sum, b) => {
                const val = Number(b.price ?? b.total_price ?? b.totalPrice ?? 0);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);

        // Total señas cobradas (anticipos ingresados)
        const totalDeposits = activeBookings.reduce((sum, b) => {
            const dep = Number(b.deposit_amount ?? b.depositAmount ?? b.metadata?.deposit_amount ?? b.metadata?.depositAmount ?? 0);
            return sum + (isNaN(dep) ? 0 : dep);
        }, 0);

        // Saldos futuros a cobrar al ingresar el evento (precio total - seña recibida)
        const pendingBalance = activeBookings
            .filter(b => b.status === 'confirmed' || b.status === 'deposit_paid')
            .reduce((sum, b) => {
                const price = Number(b.price ?? b.total_price ?? b.totalPrice ?? 0);
                const dep = Number(b.deposit_amount ?? b.depositAmount ?? b.metadata?.deposit_amount ?? b.metadata?.depositAmount ?? 0);
                const bal = price > dep ? (price - dep) : 0;
                return sum + (isNaN(bal) ? 0 : bal);
            }, 0);

        // Ticket promedio
        const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

        // Tasa de efectividad / concreción
        const totalAttempts = totalBookings + cancelledBookings;
        const completionRate = totalAttempts > 0 ? (totalBookings / totalAttempts) * 100 : (totalBookings > 0 ? 100 : 0);

        // Anticipación promedio de reserva (Lead Time en días)
        let leadTimeDaysTotal = 0;
        let leadTimeValidCount = 0;
        activeBookings.forEach(b => {
            const eventDateStr = b._normalizedDate;
            const createdAtStr = b.created_at;
            if (eventDateStr && createdAtStr) {
                const ev = new Date(eventDateStr + 'T00:00:00');
                const cr = new Date(createdAtStr);
                if (!isNaN(ev.getTime()) && !isNaN(cr.getTime())) {
                    const diffDays = Math.round((ev.getTime() - cr.getTime()) / (1000 * 3600 * 24));
                    if (diffDays >= 0 && diffDays <= 365) {
                        leadTimeDaysTotal += diffDays;
                        leadTimeValidCount++;
                    }
                }
            }
        });
        const avgLeadTimeDays = leadTimeValidCount > 0
            ? Math.round(leadTimeDaysTotal / leadTimeValidCount)
            : null;

        // Ocupación del Calendario (Fines de semana y fechas del período)
        let calStart = dateRange?.start ? normalizeDate(dateRange.start) : null;
        let calEnd = dateRange?.end ? normalizeDate(dateRange.end) : null;

        if (!calStart || !calEnd) {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth();
            const firstD = new Date(y, m, 1);
            const lastD = new Date(y, m + 1, 0);
            calStart = firstD.toISOString().split('T')[0];
            calEnd = lastD.toISOString().split('T')[0];
        }

        let totalDaysInPeriod = 0;
        let totalWeekendDaysInPeriod = 0;
        let bookedDaysCount = 0;
        let bookedWeekendDaysCount = 0;

        const bookedDatesSet = new Set(
            activeBookings.map(b => b._normalizedDate).filter(Boolean)
        );

        if (calStart && calEnd) {
            const curDate = new Date(calStart + 'T00:00:00');
            const targetEndDate = new Date(calEnd + 'T00:00:00');
            let safety = 0;

            while (curDate <= targetEndDate && safety < 370) {
                const dateIso = curDate.toISOString().split('T')[0];
                const dayOfWeek = curDate.getDay(); // 0: Dom, 5: Vie, 6: Sáb
                const isWknd = (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6);

                totalDaysInPeriod++;
                if (isWknd) totalWeekendDaysInPeriod++;

                if (bookedDatesSet.has(dateIso)) {
                    bookedDaysCount++;
                    if (isWknd) bookedWeekendDaysCount++;
                }

                curDate.setDate(curDate.getDate() + 1);
                safety++;
            }
        }

        const weekendOccupancyRate = totalWeekendDaysInPeriod > 0
            ? Math.round((bookedWeekendDaysCount / totalWeekendDaysInPeriod) * 100)
            : 0;

        const totalOccupancyRate = totalDaysInPeriod > 0
            ? Math.round((bookedDaysCount / totalDaysInPeriod) * 100)
            : 0;

        const freeWeekendDays = Math.max(0, totalWeekendDaysInPeriod - bookedWeekendDaysCount);
        const freeTotalDays = Math.max(0, totalDaysInPeriod - bookedDaysCount);

        // Evolución Mensual / Estacionalidad (Mes a Mes)
        const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyMap = {};

        // Asegurar últimos 6 meses para visualización clara
        const refDate = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[ym] = {
                yearMonth: ym,
                monthLabel: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
                events: 0,
                revenue: 0,
                deposits: 0
            };
        }

        // Sumar datos de todas las reservas activas
        nonBlocked.forEach(b => {
            if (!ACTIVE_STATES.includes(b.status)) return;
            const d = b._normalizedDate;
            if (!d) return;
            const ym = d.substring(0, 7);
            if (!monthlyMap[ym]) {
                const parts = ym.split('-');
                const y = parts[0];
                const m = parseInt(parts[1], 10) - 1;
                monthlyMap[ym] = {
                    yearMonth: ym,
                    monthLabel: `${MONTH_NAMES[m] || 'Mes'} ${y.slice(2)}`,
                    events: 0,
                    revenue: 0,
                    deposits: 0
                };
            }
            monthlyMap[ym].events += 1;
            const price = Number(b.price ?? b.total_price ?? b.totalPrice ?? 0) || 0;
            monthlyMap[ym].revenue += price;
            const dep = Number(b.deposit_amount ?? b.depositAmount ?? b.metadata?.deposit_amount ?? b.metadata?.depositAmount ?? 0);
            monthlyMap[ym].deposits += (isNaN(dep) ? 0 : dep);
        });

        const monthlyEvolution = Object.values(monthlyMap)
            .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

        // Impacto de Adicionales & Extras (Upselling)
        let totalExtrasRevenue = 0;
        let eventsWithExtras = 0;

        activeBookings.forEach(b => {
            const rawServices = b.selected_services || b.selectedServices || b.additional_services || b.metadata?.selectedServices || [];
            let hasExtras = false;
            if (Array.isArray(rawServices) && rawServices.length > 0) {
                rawServices.forEach(item => {
                    let price = 0;
                    let qty = 1;
                    if (typeof item === 'object' && item !== null) {
                        price = Number(item.price || 0);
                        qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                    }
                    if (price > 0 || (typeof item === 'string' && item.trim())) {
                        totalExtrasRevenue += (price * qty);
                        hasExtras = true;
                    }
                });
            }
            if (hasExtras) eventsWithExtras++;
        });

        const extrasRevenuePercent = totalRevenue > 0
            ? Math.round((totalExtrasRevenue / totalRevenue) * 100)
            : 0;

        const extrasAdoptionRate = totalBookings > 0
            ? Math.round((eventsWithExtras / totalBookings) * 100)
            : 0;

        const baseRentalRevenue = Math.max(0, totalRevenue - totalExtrasRevenue);
        const baseRentalPercent = 100 - extrasRevenuePercent;

        // Pipeline Futuro (Próximos Eventos & Saldos por Cobrar)
        const todayNow = new Date();
        const todayIso = `${todayNow.getFullYear()}-${String(todayNow.getMonth() + 1).padStart(2, '0')}-${String(todayNow.getDate()).padStart(2, '0')}`;

        const limit30 = new Date(todayNow);
        limit30.setDate(todayNow.getDate() + 30);
        const limit30Iso = `${limit30.getFullYear()}-${String(limit30.getMonth() + 1).padStart(2, '0')}-${String(limit30.getDate()).padStart(2, '0')}`;

        let futureEventsCount = 0;
        let futureRevenue = 0;
        let futurePendingBalance = 0;
        let next30DaysEvents = 0;
        let next30DaysRevenue = 0;

        nonBlocked.forEach(b => {
            if (!ACTIVE_STATES.includes(b.status)) return;
            const d = b._normalizedDate;
            if (d && d >= todayIso) {
                futureEventsCount++;
                const price = Number(b.price ?? b.total_price ?? b.totalPrice ?? 0);
                const dep = Number(b.deposit_amount ?? b.depositAmount ?? b.metadata?.deposit_amount ?? b.metadata?.depositAmount ?? 0);
                futureRevenue += price;
                futurePendingBalance += Math.max(0, price - dep);

                if (d <= limit30Iso) {
                    next30DaysEvents++;
                    next30DaysRevenue += price;
                }
            }
        });

        // 4. Rendimiento por Cancha / Espacio
        const courtMap = {};
        activeBookings.forEach(b => {
            const name = b.courts?.name || b.court_name || b.resource_name || b.resourceName || b.services?.name || b.service_name || (isRental ? 'Espacio Principal' : 'Cancha Principal');
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

        // 5. Desglose de Adicionales Vendidos con tasa de penetración
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
                            additionalsMap[name] = { name, quantity: 0, revenue: 0, bookingCount: 0 };
                        }
                        additionalsMap[name].quantity += qty;
                        additionalsMap[name].revenue += (price * qty);
                        additionalsMap[name].bookingCount += 1;
                    }
                });
            }
        });

        const additionalsBreakdown = Object.values(additionalsMap)
            .map(item => ({
                ...item,
                penetration: totalBookings > 0 ? Math.round((item.bookingCount / totalBookings) * 100) : 0
            }))
            .sort((a, b) => b.quantity - a.quantity);

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
                pendingBalance,
                totalBookings,
                completedBookings,
                confirmedBookings,
                pendingBookings,
                cancelledBookings,
                avgBookingValue,
                completionRate,
                courtsBreakdown,
                additionalsBreakdown,
                topCustomers,
                // Métricas específicas de Alquileres / Venues
                isRental,
                // Ocupación de Calendario
                weekendOccupancyRate,
                totalOccupancyRate,
                totalWeekendDaysInPeriod,
                bookedWeekendDaysCount,
                freeWeekendDays,
                totalDaysInPeriod,
                bookedDaysCount,
                freeTotalDays,
                // Anticipación
                avgLeadTimeDays,
                // Impacto de Extras / Upselling
                totalExtrasRevenue,
                extrasRevenuePercent,
                eventsWithExtras,
                extrasAdoptionRate,
                baseRentalRevenue,
                baseRentalPercent,
                // Pipeline Futuro
                futureEventsCount,
                futureRevenue,
                futurePendingBalance,
                next30DaysEvents,
                next30DaysRevenue,
                // Evolución Mensual (Estacionalidad)
                monthlyEvolution
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
