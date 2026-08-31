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

    // --- STEP 1: CALCULATE PRICING AND PLAN ---
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

    // Try finding matching plan in subscription_plans if available
    let dbPlanId = planId;
    try {
        const { data: matchedPlans } = await supabase
            .from('subscription_plans')
            .select('id, spaces_included')
            .eq('business_type', businessType === 'courts' ? 'sport' : businessType)
            .order('spaces_included', { ascending: true });

        if (matchedPlans && matchedPlans.length > 0) {
            const exactPlan = matchedPlans.find(p => p.spaces_included === requestedCount);
            if (exactPlan) dbPlanId = exactPlan.id;
            else {
                const biggerPlan = matchedPlans.find(p => p.spaces_included >= requestedCount);
                dbPlanId = biggerPlan ? biggerPlan.id : matchedPlans[matchedPlans.length - 1].id;
            }
        }
    } catch (e) {
        console.warn('Subscription plans match notice:', e);
    }

    // --- STEP 2: UPDATE SUBSCRIPTION SPACE LIMIT FIRST (PREVENTS DATABASE TRIGGER LIMIT ERROR) ---
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const subPayload = {
        spaces_included: requestedCount,
        monthly_price: calculatedPrice,
        plan_name: planName,
        status: 'active',
        billing_start: today,
        next_billing_date: nextMonth,
        updated_at: new Date().toISOString()
    };

    const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

    if (existingSub) {
        const { error: subUpdateErr } = await supabase
            .from('subscriptions')
            .update(subPayload)
            .eq('business_id', businessId);
        if (subUpdateErr) {
            console.error('Error updating subscriptions:', subUpdateErr);
            throw subUpdateErr;
        }
    } else {
        const { error: subInsertErr } = await supabase
            .from('subscriptions')
            .insert({
                business_id: businessId,
                ...subPayload
            });
        if (subInsertErr) {
            console.error('Error inserting subscriptions:', subInsertErr);
            throw subInsertErr;
        }
    }

    // --- STEP 3: SYNC RESOURCES (COURTS / SPECIALISTS) NOW THAT CAPACITY IS ELEVATED ---
    if (businessType === 'service') {
        try {
            await supabase.from('courts').delete().eq('business_id', businessId);
            await supabase.from('resources').delete().eq('business_id', businessId).eq('type', 'court');
        } catch (e) {
            console.warn('Cleanup courts notice:', e);
        }

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
        try {
            await supabase.from('service_specialists').delete().eq('business_id', businessId);
        } catch (e) {}
        try {
            await supabase.from('specialists').delete().eq('business_id', businessId);
            await supabase.from('resources').delete().eq('business_id', businessId).eq('type', 'service');
        } catch (e) {
            console.warn('Cleanup specialists notice:', e);
        }

        const generateUUID = () => {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        };

        const { data: existingCourts, error: fetchCourtsErr } = await supabase
            .from('courts')
            .select('*')
            .eq('business_id', businessId)
            .order('name', { ascending: true });

        if (fetchCourtsErr) console.warn('Fetch existing courts notice:', fetchCourtsErr);

        const currentCount = existingCourts ? existingCourts.length : 0;
        if (currentCount < requestedCount) {
            let defaultSport = 'padel';
            try {
                const { data: biz } = await supabase.from('businesses').select('name, category').eq('id', businessId).maybeSingle();
                const n = (biz?.name || '').toLowerCase();
                const c = (biz?.category || '').toLowerCase();
                if (n.includes('futbol') || c.includes('futbol')) defaultSport = 'futbol';
                else if (n.includes('tenis') || c.includes('tenis')) defaultSport = 'tenis';
                else defaultSport = 'padel';
            } catch (e) {}

            const courtsToInsert = Array.from({ length: requestedCount - currentCount }, (_, i) => ({
                id: generateUUID(),
                business_id: businessId,
                name: `Cancha ${currentCount + i + 1}`,
                sport: defaultSport,
                price: price || 10000
            }));

            const { error: cErr } = await supabase
                .from('courts')
                .insert(courtsToInsert);

            if (cErr) {
                console.warn('First insert attempt on courts with price:', cErr.message);
                const simpleCourts = courtsToInsert.map(({ price: _, ...rest }) => rest);
                const { error: cErr2 } = await supabase
                    .from('courts')
                    .insert(simpleCourts);
                if (cErr2) {
                    console.error('Failed to insert courts:', cErr2);
                    throw cErr2;
                }
            }

            try {
                await supabase.from('resources').insert(courtsToInsert.map(c => ({
                    id: c.id,
                    business_id: c.business_id,
                    name: c.name,
                    type: 'court',
                    sport: c.sport,
                    base_price: c.price || price || 10000,
                    active: true
                })));
            } catch (rErr) {
                console.warn('Resources insert notice:', rErr.message);
            }
        } else if (currentCount > requestedCount) {
            const courtsToRemove = existingCourts.slice(requestedCount);
            const idsToRemove = courtsToRemove.map(c => c.id);
            if (idsToRemove.length > 0) {
                const { error: delErr } = await supabase.from('courts').delete().in('id', idsToRemove);
                if (delErr) throw delErr;
                try { await supabase.from('resources').delete().in('id', idsToRemove); } catch (e) {}
            }
        }
    } else if (businessType === 'venue' || businessType === 'alquiler') {
        try {
            await supabase.from('specialists').delete().eq('business_id', businessId);
            await supabase.from('courts').delete().eq('business_id', businessId);
            await supabase.from('resources').delete().eq('business_id', businessId);
        } catch (e) {
            console.warn('Cleanup rental resources notice:', e);
        }
    }
}
