import { supabase } from '../supabaseClient';

/**
 * Genera un token único y seguro para solicitar reseña por WhatsApp al cliente.
 */
export async function generateReviewToken(booking) {
    const token = 'rev_' + crypto.randomUUID().replace(/-/g, '');

    const existingMetadata = booking.metadata || {};
    const { error } = await supabase.from('bookings').update({
        metadata: {
            ...existingMetadata,
            review_token: token,
            review_invited_at: new Date().toISOString()
        }
    }).eq('id', booking.id);

    if (error) {
        console.error('Error generating review token:', error);
        throw error;
    }

    return token;
}

/**
 * Obtiene los datos del negocio y reserva asociados a un token de reseña.
 */
export async function getReviewInfoByToken(token) {
    const { data, error } = await supabase.rpc('get_review_info', { p_token: token });
    if (error) {
        console.error('Error fetching review info by token:', error);
        return { success: false, error: 'Error al verificar enlace de reseña.' };
    }
    return data || { success: false, error: 'Enlace de reseña no válido o expirado.' };
}

/**
 * Guarda la calificación y comentario del cliente por token único.
 */
export async function submitReviewByToken(token, { rating, comment, customer_name }) {
    const { error } = await supabase.rpc('submit_review', {
        p_token: token,
        p_rating: parseInt(rating, 10) || 5,
        p_comment: comment || '',
        p_customer_name: customer_name || ''
    });
    if (error) {
        console.error('Error submitting review:', error);
        throw new Error(error.message || 'No se pudo enviar la reseña.');
    }
    return { success: true };
}

/**
 * Obtiene las reseñas aprobadas de un negocio para mostrarlas en su página.
 */
export async function getReviewsByBusinessId(businessId) {
    const { data, error } = await supabase.rpc('get_business_reviews', { p_business_id: businessId });
    if (error) {
        console.error('Error in getReviewsByBusinessId:', error);
        return { reviews: [], rating_avg: 5.0, reviews_count: 0 };
    }

    const reviews = (data || []).filter(r => r && r.rating > 0);
    const count = reviews.length;
    const avg = count > 0
        ? parseFloat((reviews.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 5), 0) / count).toFixed(1))
        : 5.0;

    return { reviews, rating_avg: avg, reviews_count: count };
}

/**
 * Obtiene todas las reseñas para la pestaña de moderación del SuperAdmin.
 */
export async function getAllReviewsForSuperAdmin() {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, businesses(id, name, logo)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            return data;
        }
        return [];
    } catch (e) {
        console.error('Error fetching reviews for super admin:', e);
        return [];
    }
}

/**
 * Modera o elimina una reseña.
 */
export async function deleteOrModerateReview(reviewId, status = 'rejected') {
    try {
        if (status === 'delete') {
            await supabase.from('reviews').delete().eq('id', reviewId);
        } else {
            await supabase.from('reviews').update({ status }).eq('id', reviewId);
        }
        return true;
    } catch (e) {
        console.error('Error moderating review:', e);
        throw e;
    }
}
