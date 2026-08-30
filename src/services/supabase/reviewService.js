import { supabase } from '../supabaseClient';

/**
 * Genera un token único y seguro para solicitar reseña por WhatsApp al cliente.
 */
export async function generateReviewToken(booking) {
    try {
        const token = 'rev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        
        // Try saving to reviews table as pending/reserved token
        try {
            await supabase.from('reviews').insert([{
                business_id: booking.business_id,
                booking_id: booking.id,
                customer_name: booking.customer_name || 'Cliente',
                customer_phone: booking.customer_phone || '',
                rating: 0,
                comment: '',
                token: token,
                status: 'pending',
                metadata: {
                    booking_date: booking.booking_date || booking.date,
                    service_name: booking.service_name || booking.sport || 'Reserva'
                }
            }]);
        } catch (err) {
            console.warn('Reviews table insert fallback:', err.message);
        }

        // Also attach review_token to booking metadata
        const existingMetadata = booking.metadata || {};
        await supabase.from('bookings').update({
            metadata: {
                ...existingMetadata,
                review_token: token,
                review_invited_at: new Date().toISOString()
            }
        }).eq('id', booking.id);

        return token;
    } catch (e) {
        console.error('Error generating review token:', e);
        const fallbackToken = 'rev_' + (booking.id ? booking.id.slice(0, 8) : Date.now().toString(36));
        return fallbackToken;
    }
}

/**
 * Obtiene los datos del negocio y reserva asociados a un token de reseña.
 */
export async function getReviewInfoByToken(token) {
    try {
        // 1. Try querying reviews table
        const { data: revData } = await supabase
            .from('reviews')
            .select('*, businesses(*)')
            .eq('token', token)
            .maybeSingle();

        if (revData) {
            return {
                success: true,
                isAlreadySubmitted: revData.rating > 0 && revData.status === 'approved',
                review: revData,
                business: revData.businesses,
                customer_name: revData.customer_name
            };
        }

        // 2. Try looking up inside bookings metadata
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*, businesses(*)')
            .filter('metadata->>review_token', 'eq', token)
            .limit(1);

        if (bookings && bookings.length > 0) {
            const booking = bookings[0];
            const isAlreadySubmitted = !!booking.metadata?.review_submitted;
            return {
                success: true,
                isAlreadySubmitted,
                booking,
                business: booking.businesses,
                customer_name: booking.customer_name,
                review: booking.metadata?.review_data || null
            };
        }

        // 3. Check if token matches booking ID directly
        const cleanToken = token.replace('rev_', '');
        const { data: directBooking } = await supabase
            .from('bookings')
            .select('*, businesses(*)')
            .ilike('id', `${cleanToken}%`)
            .limit(1);

        if (directBooking && directBooking.length > 0) {
            const booking = directBooking[0];
            const isAlreadySubmitted = !!booking.metadata?.review_submitted;
            return {
                success: true,
                isAlreadySubmitted,
                booking,
                business: booking.businesses,
                customer_name: booking.customer_name,
                review: booking.metadata?.review_data || null
            };
        }

        return { success: false, error: 'Enlace de reseña no válido o expirado.' };
    } catch (e) {
        console.error('Error fetching review info by token:', e);
        return { success: false, error: 'Error al verificar enlace de reseña.' };
    }
}

/**
 * Recalcula y actualiza el rating promedio y contador de un negocio.
 */
export async function recalculateBusinessRating(businessId) {
    try {
        const { reviews } = await getReviewsByBusinessId(businessId);
        if (!reviews || reviews.length === 0) return;

        const total = reviews.reduce((sum, r) => sum + (parseInt(r.rating, 10) || 5), 0);
        const avg = parseFloat((total / reviews.length).toFixed(1));

        // Update business record
        const { data: bData } = await supabase.from('businesses').select('metadata').eq('id', businessId).single();
        const curMeta = bData?.metadata || {};

        await supabase.from('businesses').update({
            rating_avg: avg,
            reviews_count: reviews.length,
            metadata: {
                ...curMeta,
                rating_avg: avg,
                reviews_count: reviews.length,
                reviews_cache: reviews.slice(0, 10)
            }
        }).eq('id', businessId);
    } catch (e) {
        console.warn('Recalculate rating notice:', e.message);
    }
}

/**
 * Guarda la calificación y comentario del cliente por token único.
 */
export async function submitReviewByToken(token, { rating, comment, customer_name }) {
    try {
        const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
        const cleanComment = (comment || '').trim();

        const reviewInfo = await getReviewInfoByToken(token);
        if (!reviewInfo.success) {
            throw new Error(reviewInfo.error || 'Token inválido');
        }
        if (reviewInfo.isAlreadySubmitted) {
            throw new Error('Esta reseña ya ha sido enviada anteriormente.');
        }

        const businessId = reviewInfo.business?.id || reviewInfo.review?.business_id || reviewInfo.booking?.business_id;
        const bookingId = reviewInfo.booking?.id || reviewInfo.review?.booking_id;
        const finalCustomerName = (customer_name || reviewInfo.customer_name || 'Cliente').trim();

        // 1. Try upserting to reviews table
        let savedToTable = false;
        try {
            const { error: upsertErr } = await supabase.from('reviews').upsert({
                token: token,
                business_id: businessId,
                booking_id: bookingId,
                customer_name: finalCustomerName,
                rating: numRating,
                comment: cleanComment,
                status: 'approved',
                created_at: new Date().toISOString()
            }, { onConflict: 'token' });

            if (!upsertErr) savedToTable = true;
        } catch (err) {
            console.warn('Reviews table upsert notice:', err.message);
        }

        // 2. Always record in booking metadata to prevent duplicate submission
        if (bookingId) {
            const { data: bData } = await supabase.from('bookings').select('metadata').eq('id', bookingId).single();
            const curMeta = bData?.metadata || {};
            await supabase.from('bookings').update({
                metadata: {
                    ...curMeta,
                    review_submitted: true,
                    review_data: {
                        rating: numRating,
                        comment: cleanComment,
                        customer_name: finalCustomerName,
                        created_at: new Date().toISOString()
                    }
                }
            }).eq('id', bookingId);
        }

        // 3. Update business rating cache & metadata reviews list
        if (businessId) {
            await recalculateBusinessRating(businessId);
        }

        return { success: true };
    } catch (e) {
        console.error('Error submitting review:', e);
        throw e;
    }
}

/**
 * Obtiene las reseñas aprobadas de un negocio para mostrarlas en su página.
 */
export async function getReviewsByBusinessId(businessId) {
    try {
        let list = [];

        // 1. Try querying reviews table
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('business_id', businessId)
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (!error && data) {
                list = data;
            }
        } catch (err) {
            console.warn('Reviews table select notice:', err.message);
        }

        // 2. If list empty, check bookings metadata or business metadata cache
        if (list.length === 0) {
            const { data: bData } = await supabase.from('businesses').select('metadata').eq('id', businessId).single();
            if (bData?.metadata?.reviews_cache && Array.isArray(bData.metadata.reviews_cache)) {
                list = bData.metadata.reviews_cache;
            } else {
                // Fallback to completed bookings with reviews
                const { data: bkList } = await supabase
                    .from('bookings')
                    .select('metadata')
                    .eq('business_id', businessId)
                    .filter('metadata->>review_submitted', 'eq', 'true')
                    .limit(20);

                if (bkList && bkList.length > 0) {
                    list = bkList.map(b => b.metadata?.review_data).filter(Boolean);
                }
            }
        }

        const validReviews = list.filter(r => r && r.rating > 0);
        const count = validReviews.length;
        const avg = count > 0
            ? parseFloat((validReviews.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 5), 0) / count).toFixed(1))
            : 5.0;

        return {
            reviews: validReviews,
            rating_avg: avg,
            reviews_count: count
        };
    } catch (e) {
        console.error('Error in getReviewsByBusinessId:', e);
        return { reviews: [], rating_avg: 5.0, reviews_count: 0 };
    }
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
