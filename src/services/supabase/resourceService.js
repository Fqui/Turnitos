import { supabase } from '../supabaseClient';

export async function getResources(businessId, type = null) {
    let query = supabase
        .from('resources')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name', { ascending: true });

    if (type) {
        query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getResourceById(resourceId) {
    const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resourceId)
        .single();

    if (error) throw error;
    return data;
}

export async function createResource(resourceData) {
    const { data, error } = await supabase
        .from('resources')
        .insert([{
            business_id: resourceData.business_id,
            name: resourceData.name,
            type: resourceData.type,
            sport: resourceData.sport || null,
            category: resourceData.category || null,
            base_price: resourceData.base_price || 0,
            duration_minutes: resourceData.duration_minutes || 60,
            buffer_minutes: resourceData.buffer_minutes || 15,
            capacity: resourceData.capacity || 1,
            consumes_space: resourceData.consumes_space !== undefined ? resourceData.consumes_space : true,
            active: true,
            metadata: resourceData.metadata || {}
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateResource(resourceId, updates) {
    const { data, error } = await supabase
        .from('resources')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', resourceId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteResource(resourceId) {
    return updateResource(resourceId, { active: false });
}

export async function checkResourceAvailability(resourceId, startTime, endTime, excludeBookingId = null) {
    const { data, error } = await supabase
        .rpc('check_resource_availability', {
            p_resource_id: resourceId,
            p_start_time: startTime,
            p_end_time: endTime,
            p_exclude_booking_id: excludeBookingId
        });

    if (error) throw error;
    return data[0];
}

export async function syncBusinessResources(businessId, businessType, requestedCount, price = null) {
    if (!businessId || requestedCount <= 0) return;

    if (businessType === 'service') {
        const { data: existingSpecs } = await supabase
            .from('specialists')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: true });

        const currentCount = existingSpecs ? existingSpecs.length : 0;
        if (currentCount < requestedCount) {
            const specsToInsert = Array.from({ length: requestedCount - currentCount }, (_, i) => ({
                business_id: businessId,
                name: `Especialista ${currentCount + i + 1}`,
                role: 'General'
            }));
            try { await supabase.from('specialists').insert(specsToInsert); } catch (e) { console.warn(e.message); }
            try {
                await supabase.from('resources').insert(specsToInsert.map(s => ({
                    business_id: s.business_id,
                    name: s.name,
                    type: 'service',
                    active: true
                })));
            } catch (e) { console.warn(e.message); }
        } else if (currentCount > requestedCount) {
            const specsToRemove = existingSpecs.slice(requestedCount);
            const idsToRemove = specsToRemove.map(s => s.id);
            if (idsToRemove.length > 0) {
                try { await supabase.from('service_specialists').delete().in('specialist_id', idsToRemove); } catch (e) {}
                try { await supabase.from('specialists').delete().in('id', idsToRemove); } catch (e) {}
                try { await supabase.from('resources').delete().in('id', idsToRemove); } catch (e) {}
            }
        }
    } else if (businessType === 'sport' || businessType === 'courts') {
        const { data: existingCourts } = await supabase
            .from('courts')
            .select('*')
            .eq('business_id', businessId)
            .order('name', { ascending: true });

        const currentCount = existingCourts ? existingCourts.length : 0;
        if (currentCount < requestedCount) {
            const courtsToInsert = Array.from({ length: requestedCount - currentCount }, (_, i) => {
                let courtId;
                if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                    courtId = crypto.randomUUID();
                } else {
                    courtId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                }
                return {
                    id: courtId,
                    business_id: businessId,
                    name: `Cancha ${currentCount + i + 1}`,
                    sport: 'General',
                    price: price || 10000
                };
            });

            try { await supabase.from('courts').insert(courtsToInsert); } catch (e) { console.warn(e.message); }
            try {
                await supabase.from('resources').insert(courtsToInsert.map(c => ({
                    id: c.id,
                    business_id: c.business_id,
                    name: c.name,
                    type: 'court',
                    sport: c.sport,
                    base_price: c.price,
                    active: true
                })));
            } catch (e) { console.warn(e.message); }
        } else if (currentCount > requestedCount) {
            const courtsToRemove = existingCourts.slice(requestedCount);
            const idsToRemove = courtsToRemove.map(c => c.id);
            if (idsToRemove.length > 0) {
                try { await supabase.from('courts').delete().in('id', idsToRemove); } catch (e) {}
                try { await supabase.from('resources').delete().in('id', idsToRemove); } catch (e) {}
            }
        }
    }

    let calculatedPrice = 18000;
    let planId = 'services_individual';
    let planName = 'Servicios - Individual';

    if (businessType === 'service') {
        if (requestedCount === 1) {
            calculatedPrice = 18000;
            planId = 'services_individual';
            planName = 'Servicios - Individual';
        } else {
            const extra = Math.max(0, requestedCount - 3);
            calculatedPrice = 36000 + (extra * 10000);
            planId = 'services_team';
            planName = 'Servicios - Equipo';
        }
    } else if (businessType === 'sport' || businessType === 'courts') {
        if (requestedCount <= 3) {
            calculatedPrice = requestedCount * 20000;
            planId = 'courts_1_3';
            planName = 'Canchas (1 a 3)';
        } else if (requestedCount <= 5) {
            calculatedPrice = requestedCount * 17000;
            planId = 'courts_4_5';
            planName = 'Canchas (4 a 5)';
        } else {
            calculatedPrice = requestedCount * 15000;
            planId = 'courts_6_plus';
            planName = 'Canchas (Más de 5)';
        }
    } else if (businessType === 'venue' || businessType === 'alquiler') {
        calculatedPrice = 15000;
        planId = 'rental';
        planName = 'Plan Espacios';
    }

    try {
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle();

        if (sub) {
            await supabase
                .from('subscriptions')
                .update({ 
                    spaces_included: requestedCount,
                    monthly_price: calculatedPrice,
                    plan_id: planId,
                    plan_name: planName,
                    updated_at: new Date().toISOString() 
                })
                .eq('business_id', businessId);
        } else {
            await supabase
                .from('subscriptions')
                .insert({
                    business_id: businessId,
                    plan_id: planId,
                    plan_name: planName,
                    spaces_included: requestedCount,
                    monthly_price: calculatedPrice,
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });
        }
    } catch (e) {
        console.warn('Subscription sync notice:', e);
    }

    try {
        await supabase
            .from('businesses')
            .update({
                subscription_plan_id: planId,
                capacity_limit: requestedCount,
                resources_count: requestedCount,
                capacity: requestedCount
            })
            .eq('id', businessId);
    } catch (e) {
        console.warn('Business capacity sync notice:', e);
    }
}
