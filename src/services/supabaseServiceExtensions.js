// Additional methods for new database schema (resources, subscriptions)
import { supabase } from './supabaseClient';

export class SupabaseServiceExtensions {
    // ============================================================================
    // RESOURCES MANAGEMENT
    // ============================================================================

    /**
     * Get all resources for a business
     * @param {string} businessId - Business ID
     * @param {string} type - Optional filter by type (court, service, venue, additional)
     * @returns {Promise<Array>} List of resources
     */
    async getResources(businessId, type = null) {
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

/**
 * Get a single resource by ID
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Object>} Resource object
 */
async getResourceById(resourceId) {
    const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resourceId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create a new resource
 * @param {Object} resourceData - Resource data
 * @returns {Promise<Object>} Created resource
 */
async createResource(resourceData) {
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

/**
 * Update a resource
 * @param {string} resourceId - Resource ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated resource
 */
async updateResource(resourceId, updates) {
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

/**
 * Delete (deactivate) a resource
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Object>} Updated resource
 */
async deleteResource(resourceId) {
    return this.updateResource(resourceId, { active: false });
}

/**
 * Check resource availability for a time slot
 * @param {string} resourceId - Resource ID
 * @param {string} startTime - Start time (ISO string)
 * @param {string} endTime - End time (ISO string)
 * @param {string} excludeBookingId - Optional booking ID to exclude
 * @returns {Promise<Object>} Availability info
 */
async checkResourceAvailability(resourceId, startTime, endTime, excludeBookingId = null) {
    const { data, error } = await supabase
        .rpc('check_resource_availability', {
            p_resource_id: resourceId,
            p_start_time: startTime,
            p_end_time: endTime,
            p_exclude_booking_id: excludeBookingId
        });

    if (error) throw error;
    return data[0]; // Returns { available, slots_used, total_capacity }
}

// ============================================================================
// SUBSCRIPTIONS MANAGEMENT
// ============================================================================

/**
 * Get subscription for a business
 * @param {string} businessId - Business ID
 * @returns {Promise<Object>} Subscription object
 */
async getSubscription(businessId) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data;
}

/**
 * Get all subscription plans
 * @param {string} businessType - Optional filter by business type
 * @returns {Promise<Array>} List of subscription plans
 */
async getSubscriptionPlans(businessType = null) {
    let query = supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('spaces', { ascending: true });

    if (businessType) {
        query = query.eq('business_type', businessType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

/**
 * Create or update subscription for a business
 * @param {string} businessId - Business ID
 * @param {string} planId - Plan ID from subscription_plans
 * @returns {Promise<Object>} Created/updated subscription
 */
async updateSubscription(businessId, planId) {
    // Get plan details
    const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError) throw planError;

    // Upsert subscription
    const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
            business_id: businessId,
            plan_name: plan.name,
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
    return data;
}

// ============================================================================
// UPDATED BOOKING METHODS (for new schema)
// ============================================================================

/**
 * Create booking with new schema (resource_id, start_time, end_time)
 * @param {Object} bookingData - Booking data
 * @returns {Promise<Object>} Created booking
 */
async createBookingV2(bookingData) {
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

/**
 * Get bookings with new schema
 * @param {string} businessId - Business ID
 * @param {Date} startDate - Optional start date filter
 * @param {Date} endDate - Optional end date filter
 * @returns {Promise<Array>} List of bookings
 */
async getBookingsV2(businessId, startDate = null, endDate = null) {
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
}

export const supabaseServiceExtensions = new SupabaseServiceExtensions();
export default supabaseServiceExtensions;
