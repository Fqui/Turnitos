import { supabase } from '../supabaseClient';

export async function getStoreProducts(businessId, onlyActive = false) {
    try {
        let query = supabase
            .from('store_products')
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (onlyActive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching store products:', error);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error('Exception fetching store products:', e);
        return [];
    }
}

export async function createStoreProduct(productData) {
    const { data, error } = await supabase
        .from('store_products')
        .insert([productData])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateStoreProduct(id, productData) {
    const { data, error } = await supabase
        .from('store_products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteStoreProduct(id) {
    const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}
