import { supabase } from '../supabaseClient';

export async function getCustomers(businessId) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });

    if (error) throw error;

    // Clean up / filter out administrative blocks accidentally inserted as customers
    const validCustomers = (data || []).filter(c => {
        const name = (c.name || '').toUpperCase();
        return !name.includes('BLOQUEADO') && !name.includes('BLOQUEO') && name.trim() !== '';
    });

    // Also asynchronously purge any dummy blocked entries from the DB so table remains clean
    const blockedIds = (data || [])
        .filter(c => {
            const name = (c.name || '').toUpperCase();
            return name.includes('BLOQUEADO') || name.includes('BLOQUEO');
        })
        .map(c => c.id);

    if (blockedIds.length > 0) {
        supabase
            .from('customers')
            .delete()
            .in('id', blockedIds)
            .then(() => {})
            .catch(() => {});
    }

    return validCustomers;
}

export async function updateCustomer(customerId, customerData) {
    const { data, error } = await supabase
        .from('customers')
        .update({
            ...customerData,
            name: customerData.name ? customerData.name.toUpperCase() : customerData.name,
            updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getCustomerBookings(businessId, customerPhone) {
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            services (name),
            courts (name)
        `)
        .eq('business_id', businessId)
        .eq('customer_phone', customerPhone)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

    if (error) throw error;
    return data;
}
