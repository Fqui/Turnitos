import { supabase } from '../supabaseClient';

export async function getPromotions() {
    const { data, error } = await supabase
        .from('promotions')
        .select(`
            *,
            businesses (name)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function getPromotionById(promoId) {
    const { data, error } = await supabase
        .from('promotions')
        .select(`
            *,
            businesses (id, name, slug)
        `)
        .eq('id', promoId)
        .single();

    if (error) throw error;
    return data;
}

export async function createPromotion(promotionData) {
    const { data, error } = await supabase
        .from('promotions')
        .insert([promotionData])
        .select();

    if (error) throw error;
    return data[0];
}

export async function deletePromotion(promotionId) {
    const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotionId);

    if (error) throw error;
    return true;
}
