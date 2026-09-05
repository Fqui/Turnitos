import { supabase } from '../supabaseClient';
import { calculateBookingCommission, isFreePlan } from '../../utils/subscriptionUtils';

// Helper function to convert Date to YYYY-MM-DD in local timezone (not UTC)
export const formatDateLocal = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export async function getBookings(businessId, date = null) {
    let query = supabase
        .from('bookings')
        .select(`
            *,
            services (name),
            courts (name),
            businesses (name)
        `)
        .order('created_at', { ascending: false });

    if (businessId) {
        query = query.eq('business_id', businessId);
    }

    if (date) {
        query = query.eq('date', date);
    }

    const { data, error } = await query;
    if (error) throw error;

    const bookingsWithResourceId = data?.map(booking => ({
        ...booking,
        resource_id: booking.court_id || booking.service_id,
        notes: booking.notes || booking.metadata?.notes || '',
        deposit_amount: booking.deposit_amount !== undefined && booking.deposit_amount !== null
            ? booking.deposit_amount
            : (booking.metadata?.deposit_amount !== undefined ? booking.metadata?.deposit_amount : (booking.metadata?.depositAmount || null))
    })) || [];

    return { bookings: bookingsWithResourceId };
}

export async function validateBookingAvailability(businessId, startTime, endTime, excludeBookingId = null) {
    const { data, error } = await supabase
        .rpc('check_business_availability', {
            p_business_id: businessId,
            p_start_time: startTime,
            p_end_time: endTime,
            p_exclude_booking_id: excludeBookingId
        });

    if (error) throw error;
    return data[0];
}

export async function createBooking(bookingData) {
    let finalResourceId = bookingData.resourceId;

    if (!finalResourceId && (bookingData.courtId || bookingData.serviceId)) {
        const legacyId = bookingData.courtId || bookingData.serviceId;
        const type = bookingData.serviceId ? 'service' : 'court';

        try {
            const { data: resources } = await supabase
                .from('resources')
                .select('id, metadata')
                .eq('business_id', bookingData.businessId || bookingData.business_id)
                .eq('type', type);

            if (resources && resources.length > 0) {
                const strLegacyId = String(legacyId);
                const match = resources.find(r => {
                    const metaOriginal = r.metadata?.original_id;
                    const metaOldCourt = r.metadata?.old_court_id;
                    const metaOldService = r.metadata?.old_service_id;

                    const matchOriginal = metaOriginal && (String(metaOriginal) === strLegacyId || metaOriginal == legacyId);
                    const matchOldCourt = metaOldCourt && (String(metaOldCourt) === strLegacyId || metaOldCourt == legacyId);
                    const matchOldService = metaOldService && (String(metaOldService) === strLegacyId || metaOldService == legacyId);

                    return matchOriginal || matchOldCourt || matchOldService;
                });

                if (match) {
                    finalResourceId = match.id;
                } else {
                    finalResourceId = legacyId;
                }
            } else {
                finalResourceId = legacyId;
            }
        } catch (err) {
            finalResourceId = legacyId;
        }
    }

    const dateStr = formatDateLocal(bookingData.date);
    const startTime = `${dateStr}T${bookingData.time}:00`;

    const duration = bookingData.duration || 60;
    const [hours, minutes] = bookingData.time.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    const endTime = `${dateStr}T${endTimeStr}:00`;

    if (finalResourceId) {
        const { data: conflicts, error: conflictError } = await supabase
            .from('bookings')
            .select('id')
            .eq('resource_id', finalResourceId)
            .neq('status', 'cancelled')
            .neq('status', 'rejected')
            .lt('start_time', endTime)
            .gt('end_time', startTime);

        if (conflictError) {
            throw conflictError;
        }

        if (conflicts && conflicts.length > 0) {
            throw new Error(`Este turno ya está reservado.`);
        }
    }

    try {
        const availability = await validateBookingAvailability(
            bookingData.businessId || bookingData.business_id,
            startTime,
            endTime
        );

        if (!availability.available) {
            throw new Error(
                `No hay espacios disponibles para este horario. ` +
                `Ocupados: ${availability.slots_used}/${availability.total_capacity}`
            );
        }
    } catch (validationError) {
        throw validationError;
    }

    const targetBusinessId = bookingData.businessId || bookingData.business_id;
    const targetCustomerName = bookingData.customerName || bookingData.customer_name;
    const targetCustomerPhone = bookingData.customerPhone || bookingData.customer_phone;
    const targetCustomerEmail = bookingData.customerEmail || bookingData.customer_email;

    let bookingSource = bookingData.bookingSource || bookingData.booking_source || bookingData.metadata?.booking_source;
    if (!bookingSource && typeof window !== 'undefined') {
        try {
            bookingSource = sessionStorage.getItem('turnitos_booking_source') || 'direct';
        } catch (e) {
            bookingSource = 'direct';
        }
    }
    if (!bookingSource) bookingSource = 'direct';

    let businessPlanId = bookingData.subscriptionPlanId || bookingData.subscription_plan_id;
    let targetBusinessType = null;
    if (targetBusinessId) {
        try {
            const { data: bData } = await supabase
                .from('businesses')
                .select('subscription_plan_id, type')
                .eq('id', targetBusinessId)
                .single();
            if (bData) {
                if (!businessPlanId) businessPlanId = bData.subscription_plan_id;
                targetBusinessType = bData.type;
            }
        } catch (e) { }
    }

    if (isFreePlan(businessPlanId)) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startOfMonth = `${year}-${month}-01`;
        const endOfMonth = `${year}-${month}-31`;

        try {
            const { count: monthlyBookingsCount } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('business_id', targetBusinessId)
                .neq('status', 'cancelled')
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (monthlyBookingsCount !== null && monthlyBookingsCount >= 100) {
                throw new Error('Este negocio ha alcanzado su cupo mensual de 100 reservas online.');
            }
        } catch (err) {
            if (err.message && err.message.includes('cupo mensual')) {
                throw err;
            }
        }
    }

    const bookingPrice = Number(bookingData.price || bookingData.total_price || bookingData.totalPrice || 0);
    const commissionAmount = calculateBookingCommission({
        planId: businessPlanId,
        price: bookingPrice,
        isMarketplace: bookingSource === 'marketplace',
        businessType: targetBusinessType
    });

    let targetServiceId = bookingData.serviceId || bookingData.service_id || null;
    let targetCourtId = bookingData.courtId || bookingData.court_id || null;
    let targetSpecialistId = bookingData.specialistId || bookingData.specialist_id || null;

    if (targetServiceId) {
        const isValidUUID = typeof targetServiceId === 'string' && targetServiceId.length === 36;
        if (isValidUUID) {
            const { data: sMatch } = await supabase
                .from('services')
                .select('id')
                .eq('id', targetServiceId)
                .maybeSingle();
            if (!sMatch) targetServiceId = null;
        } else {
            targetServiceId = null;
        }
    }

    if (targetCourtId) {
        const isValidUUID = typeof targetCourtId === 'string' && targetCourtId.length === 36;
        if (isValidUUID) {
            const { data: cMatch } = await supabase
                .from('courts')
                .select('id')
                .eq('id', targetCourtId)
                .maybeSingle();
            if (!cMatch) targetCourtId = null;
        } else {
            targetCourtId = null;
        }
    }

    if (targetSpecialistId) {
        const isValidUUID = typeof targetSpecialistId === 'string' && targetSpecialistId.length === 36;
        if (isValidUUID) {
            const { data: spMatch } = await supabase
                .from('specialists')
                .select('id')
                .eq('id', targetSpecialistId)
                .maybeSingle();
            if (!spMatch) targetSpecialistId = null;
        } else {
            targetSpecialistId = null;
        }
    }

    const safeMetadata = {
        ...(bookingData.metadata || {}),
        notes: bookingData.notes || bookingData.metadata?.notes || null,
        deposit_amount: bookingData.depositAmount !== undefined ? bookingData.depositAmount : (bookingData.deposit_amount !== undefined ? bookingData.deposit_amount : null),
        duration_hours: bookingData.durationHours || bookingData.metadata?.duration_hours || (bookingData.duration ? Math.round(bookingData.duration / 60) : null),
        booking_source: bookingSource,
        commission_amount: commissionAmount,
        plan_at_booking: businessPlanId || 'standard',
        service_id_raw: bookingData.serviceId || bookingData.service_id || null,
        court_id_raw: bookingData.courtId || bookingData.court_id || null,
        specialist_id_raw: bookingData.specialistId || bookingData.specialist_id || null
    };

    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            business_id: targetBusinessId,
            service_id: targetServiceId,
            court_id: targetCourtId,
            specialist_id: targetSpecialistId,
            resource_id: finalResourceId || null,
            date: formatDateLocal(bookingData.date),
            time: bookingData.time || '00:00',
            customer_name: targetCustomerName ? targetCustomerName.toUpperCase() : '',
            customer_phone: targetCustomerPhone || '',
            customer_email: targetCustomerEmail || null,
            status: bookingData.status || 'pending',
            price: bookingPrice,
            duration: bookingData.duration,
            metadata: safeMetadata,
            guest_count: bookingData.guestCount || bookingData.guest_count || null,
            selected_services: bookingData.selectedServices || bookingData.selected_services || [],
            services_total: bookingData.servicesTotal || bookingData.services_total || 0,
            base_price: bookingData.basePrice || bookingData.base_price || null
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateBookingStatus(id, status, metadata = {}) {
    const updateData = {
        status,
        updated_at: new Date().toISOString()
    };

    if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString();
    if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = metadata.reason;
    }
    if (status === 'deposit_paid') updateData.deposit_paid_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    if (metadata.history) {
        updateData.history = metadata.history;
    }

    const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateBooking(id, updates = {}) {
    const VALID_BOOKING_COLUMNS = new Set([
        'business_id', 'service_id', 'court_id', 'specialist_id', 'resource_id',
        'date', 'time', 'customer_name', 'customer_phone', 'customer_email',
        'status', 'price', 'duration', 'metadata', 'guest_count',
        'selected_services', 'services_total', 'base_price', 'confirmed_at',
        'cancelled_at', 'cancellation_reason', 'deposit_paid_at', 'completed_at',
        'history', 'updated_at'
    ]);

    let currentMetadata = {};
    try {
        const { data: existingBooking } = await supabase
            .from('bookings')
            .select('metadata')
            .eq('id', id)
            .single();
        if (existingBooking?.metadata) {
            currentMetadata = typeof existingBooking.metadata === 'string'
                ? JSON.parse(existingBooking.metadata)
                : { ...existingBooking.metadata };
        }
    } catch (e) { }

    let metaUpdates = { ...currentMetadata };
    if (updates.metadata && typeof updates.metadata === 'object') {
        metaUpdates = { ...metaUpdates, ...updates.metadata };
    }

    if (updates.deposit_amount !== undefined || updates.depositAmount !== undefined) {
        metaUpdates.deposit_amount = Number(updates.deposit_amount !== undefined ? updates.deposit_amount : updates.depositAmount);
    }
    if (updates.notes !== undefined) {
        metaUpdates.notes = updates.notes;
    }

    const dbUpdates = {
        updated_at: new Date().toISOString(),
        metadata: metaUpdates
    };

    Object.keys(updates).forEach(key => {
        let colName = key;
        if (key === 'guestCount') colName = 'guest_count';
        if (key === 'selectedServices') colName = 'selected_services';
        if (key === 'servicesTotal') colName = 'services_total';
        if (key === 'totalPrice') colName = 'price';
        if (key === 'basePrice') colName = 'base_price';
        if (key === 'customerName') colName = 'customer_name';
        if (key === 'customerPhone') colName = 'customer_phone';
        if (key === 'customerEmail') colName = 'customer_email';

        if (VALID_BOOKING_COLUMNS.has(colName)) {
            dbUpdates[colName] = updates[key];
        }
    });

    const { data, error } = await supabase
        .from('bookings')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Supabase updateBooking error:', error);
        throw error;
    }

    const result = { ...data };
    if (result.metadata?.deposit_amount !== undefined) {
        result.deposit_amount = result.metadata.deposit_amount;
        result.depositAmount = result.metadata.deposit_amount;
    }

    return result;
}

export async function moveBooking(id, newDate, newTime, newItemId) {
    const updateData = {
        date: newDate,
        time: newTime,
        updated_at: new Date().toISOString()
    };

    if (newItemId) {
        try {
            const { data: court } = await supabase
                .from('courts')
                .select('id')
                .eq('id', newItemId)
                .maybeSingle();

            if (court) {
                updateData.court_id = newItemId;
                updateData.service_id = null;
                updateData.resource_id = newItemId;
            } else {
                const { data: service } = await supabase
                    .from('services')
                    .select('id')
                    .eq('id', newItemId)
                    .maybeSingle();

                if (service) {
                    updateData.service_id = newItemId;
                    updateData.court_id = null;
                    updateData.resource_id = newItemId;
                }
            }
        } catch (err) { }
    }

    const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteBooking(id) {
    const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

export function subscribeToBookings(businessId, callback) {
    return supabase
        .channel(`bookings-${businessId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'bookings',
                filter: `business_id=eq.${businessId}`
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();
}

export function subscribeToBusiness(businessId, callback) {
    return supabase
        .channel(`business-live-${businessId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'businesses',
                filter: `id=eq.${businessId}`
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();
}

export async function createBookingV2(bookingData) {
    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            business_id: bookingData.businessId,
            resource_id: bookingData.resourceId,
            specialist_id: bookingData.specialistId || null,
            start_time: bookingData.startTime,
            end_time: bookingData.endTime,
            customer_name: bookingData.customerName?.toUpperCase(),
            customer_phone: bookingData.customerPhone,
            customer_email: bookingData.customerEmail || null,
            status: bookingData.status || 'pending',
            total_price: bookingData.totalPrice || 0,
            notes: bookingData.notes || null,
            metadata: bookingData.metadata || {}
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getBookingsV2(businessId, startDate = null, endDate = null) {
    let query = supabase
        .from('bookings')
        .select(`
            *,
            resources (id, name, type, sport, category)
        `)
        .eq('business_id', businessId)
        .order('start_time', { ascending: true });

    if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
    }

    if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getQualifiedSpecialists(serviceId, businessId = null) {
    let specialists = [];
    try {
        const { data, error } = await supabase
            .from('service_specialists')
            .select(`
                specialist_id,
                specialists (
                    id,
                    name,
                    role,
                    avatar_url
                )
            `)
            .eq('service_id', serviceId);

        if (!error && data && data.length > 0) {
            specialists = data.map(item => item.specialists).filter(Boolean);
        }
    } catch (e) {
        console.warn('Error fetching service_specialists:', e);
    }

    if (specialists.length === 0 && businessId) {
        try {
            const { data: allSpecialists, error: fallbackError } = await supabase
                .from('specialists')
                .select('id, name, role, avatar_url')
                .eq('business_id', businessId);

            if (!fallbackError && allSpecialists && allSpecialists.length > 0) {
                specialists = allSpecialists;
            }
        } catch (fbErr) {
            console.warn('Fallback error fetching specialists:', fbErr);
        }
    }

    return specialists;
}

export async function updateServiceSpecialists(serviceId, specialistIds) {
    const { error: deleteError } = await supabase
        .from('service_specialists')
        .delete()
        .eq('service_id', serviceId);

    if (deleteError) {
        return false;
    }

    if (!specialistIds || specialistIds.length === 0) {
        return true;
    }

    const { error: insertError } = await supabase
        .from('service_specialists')
        .insert(
            specialistIds.map(specialistId => ({
                service_id: serviceId,
                specialist_id: specialistId
            }))
        );

    if (insertError) {
        return false;
    }

    return true;
}

export async function getSpecialistBookings(specialistId, date) {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('specialist_id', specialistId)
        .eq('date', date)
        .neq('status', 'cancelled');

    if (error) {
        console.error('Error fetching specialist bookings:', error);
        return [];
    }

    return data || [];
}

export async function isSpecialistAvailable(specialistId, date, time, duration) {
    const bookings = await getSpecialistBookings(specialistId, date);

    const timeToMinutes = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
    };

    const requestStart = timeToMinutes(time);
    const requestEnd = requestStart + (duration || 60);

    for (const booking of bookings) {
        const bookingStart = timeToMinutes(booking.time);
        const bookingEnd = bookingStart + (booking.duration || 60);

        if (requestStart < bookingEnd && requestEnd > bookingStart) {
            return false;
        }
    }

    return true;
}

export async function getAvailableSpecialists(serviceId, date, time, duration, businessId = null) {
    let qualifiedSpecialists = await getQualifiedSpecialists(serviceId, businessId);

    if (qualifiedSpecialists.length === 0 && businessId) {
        const { data: allSpecs } = await supabase
            .from('specialists')
            .select('id, name, role, avatar_url')
            .eq('business_id', businessId);
        if (allSpecs && allSpecs.length > 0) {
            qualifiedSpecialists = allSpecs;
        }
    }

    if (qualifiedSpecialists.length === 0) {
        return [];
    }

    const availabilityChecks = await Promise.all(
        qualifiedSpecialists.map(async (specialist) => {
            const isAvailable = await isSpecialistAvailable(
                specialist.id,
                date,
                time,
                duration
            );

            if (!isAvailable) {
                return null;
            }

            const bookings = await getSpecialistBookings(specialist.id, date);

            return {
                id: specialist.id,
                name: specialist.name,
                role: specialist.role,
                avatar_url: specialist.avatar_url,
                bookingCount: bookings.length
            };
        })
    );

    const availableSpecialists = availabilityChecks
        .filter(Boolean)
        .sort((a, b) => a.bookingCount - b.bookingCount);

    return availableSpecialists;
}
