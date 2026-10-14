import { supabase } from '../supabaseClient';
import { PLANS_CATALOG } from '../../utils/subscriptionUtils';

export async function getSubscription(businessId) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}

export async function getMonthlyBookingsStats(businessId, monthDate = new Date()) {
    try {
        const year = monthDate.getFullYear();
        const monthNum = monthDate.getMonth() + 1;
        const month = String(monthNum).padStart(2, '0');
        const startOfMonth = `${year}-${month}-01`;
        // A booking is billed in the month it was CREATED (Argentina time), never twice
        const nextMonth = new Date(year, monthNum, 1);
        const startOfMonthIso = `${startOfMonth}T00:00:00-03:00`;
        const startOfNextMonthIso = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01T00:00:00-03:00`;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('id, date, time, customer_name, customer_phone, price, status, metadata, created_at')
            .eq('business_id', businessId)
            .gte('created_at', startOfMonthIso)
            .lt('created_at', startOfNextMonthIso)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch business info to check plan and type
        const { data: bizData, error: bizError } = await supabase
            .from('businesses')
            .select('type, subscription_plan_id')
            .eq('id', businessId)
            .maybeSingle();
        if (bizError) throw bizError;

        const isRentalBiz = bizData?.type === 'alquiler' ||
            bizData?.type === 'rental' ||
            bizData?.type === 'venue';

        const nonBlockedBookings = (bookings || []).filter(b => 
            b.status !== 'cancelled' && 
            b.status !== 'rejected' &&
            b.status !== 'blocked' &&
            !b.customer_name?.toUpperCase().includes('BLOQUEADO') &&
            !b.metadata?.notes?.toUpperCase?.().includes('BLOQUEO')
        );

        const isItemMarketplace = (b) => {
            const src = b.metadata?.booking_source || b.booking_source || b.bookingSource || b.metadata?.source;
            return src === 'marketplace';
        };

        const marketplaceBookings = nonBlockedBookings.filter(isItemMarketplace);
        const directBookings = nonBlockedBookings.filter(b => !isItemMarketplace(b));

        let totalMarketplaceCommission = 0;
        marketplaceBookings.forEach(b => {
            let comm = 0;
            if (isRentalBiz) {
                comm = Math.round(Number(b.price || 0) * 0.03);
            } else if (b.metadata?.commission_amount !== undefined && b.metadata?.commission_amount !== null && Number(b.metadata.commission_amount) > 0) {
                comm = Number(b.metadata.commission_amount);
            } else {
                comm = 500;
            }
            totalMarketplaceCommission += comm;
        });

        return {
            month: `${year}-${month}`,
            totalBookings: nonBlockedBookings.length,
            marketplaceBookings: marketplaceBookings.length,
            directBookings: directBookings.length,
            totalMarketplaceCommission,
            marketplaceList: marketplaceBookings
        };
    } catch (e) {
        console.error('Error in getMonthlyBookingsStats:', e);
        return {
            error: true,
            month: '',
            totalBookings: 0,
            marketplaceBookings: 0,
            directBookings: 0,
            totalMarketplaceCommission: 0,
            marketplaceList: []
        };
    }
}

export async function getSubscriptionPlans(businessType = null) {
    try {
        let query = supabase
            .from('subscription_plans')
            .select('*')
            .order('display_order', { ascending: true });

        if (businessType) {
            query = query.eq('business_type', businessType);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
            return data;
        }
    } catch (e) {
        console.warn('Could not load plans from DB, using PLANS_CATALOG fallback:', e);
    }

    let filtered = PLANS_CATALOG;
    if (businessType) {
        const normalized = businessType === 'service' ? 'services' : businessType;
        filtered = PLANS_CATALOG.filter(p => p.business_type === normalized || p.business_type === businessType || p.business_type === 'all');
    }

    return filtered.map(p => ({
        id: p.id,
        name: p.name,
        price_monthly: p.monthly_price || p.monthly_price_per_unit || 0,
        monthly_price: p.monthly_price || p.monthly_price_per_unit || 0,
        spaces_included: p.id === 'services_team' ? 3 : (p.id === 'courts_4_5' ? 4 : (p.id === 'courts_6_plus' ? 6 : 1)),
        business_type: p.business_type,
        description: p.description
    }));
}

export async function updateSubscription(businessId, planId) {
    const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError) throw planError;

    const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
            business_id: businessId,
            plan_name: plan.id,
            spaces_included: plan.spaces,
            monthly_price: plan.monthly_price,
            status: 'active',
            billing_start: new Date().toISOString().split('T')[0],
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }, {
            onConflict: 'business_id'
        })
        .select()
        .single();

    if (error) throw error;

    try {
        await supabase
            .from('businesses')
            .update({ capacity: plan.spaces })
            .eq('id', businessId);
    } catch (capacityError) {
        console.warn('Error updating business capacity:', capacityError);
    }

    return data;
}

export async function getSubscriptionPlanById(id) {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createDefaultSubscription(businessId, planId = null) {
    try {
        let plan;
        if (planId) {
            const { data } = await supabase.from('subscription_plans').select('*').eq('id', planId).single();
            plan = data;
        } else {
            const { data } = await supabase.from('subscription_plans').select('*').order('price_monthly', { ascending: true }).limit(1).single();
            plan = data;
        }

        if (!plan) {
            throw new Error('No subscription plan found');
        }

        const startDate = new Date();
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        const { error } = await supabase.from('subscriptions').insert([{
            business_id: businessId,
            plan_name: plan.id,
            status: 'active',
            spaces_included: plan.spaces_included,
            monthly_price: plan.price_monthly,
            billing_start: startDate.toISOString(),
            next_billing_date: nextBilling.toISOString()
        }]);

        if (error) throw error;

        await supabase.from('businesses').update({ capacity: plan.spaces_included }).eq('id', businessId);

    } catch (error) {
        throw error;
    }
}
