
import { supabase } from './supabaseClient';

class SupabaseService {

    // --- Businesses ---

    async getBusinesses() {
        const { data, error } = await supabase
            .from('businesses')
            .select(`
                *,
                services (*),
                courts (*)
            `);

        if (error) throw error;
        return data;
    }

    async getBusinessById(id) {
        const { data, error } = await supabase
            .from('businesses')
            .select(`
                *,
                services (
                    *,
                    service_specialists (
                        specialists (*)
                    )
                ),
                courts (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async createBusiness(businessData) {
        // 1. Upsert business (Insert or Update)
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .upsert([{
                id: businessData.id, // Use provided ID
                name: businessData.name,
                category: businessData.category,
                type: businessData.type,
                image: businessData.image || businessData.logo, // Fallback to logo for backward compatibility
                logo: businessData.logo,
                banner_image: businessData.banner_image,
                location: businessData.location,
                latitude: businessData.latitude,
                longitude: businessData.longitude,
                rating: businessData.rating || 0,
                theme: businessData.theme || 'light',
                amenities: businessData.amenities || [],
                hours: businessData.hours,
                sport_types: businessData.sportTypes || []
            }])
            .select()
            .single();

        if (businessError) throw businessError;

        // 2. Insert services if any (Delete existing first to avoid duplicates on re-seed)
        if (businessData.services && businessData.services.length > 0) {
            // Delete existing services for this business
            await supabase.from('services').delete().eq('business_id', business.id);

            const servicesToInsert = businessData.services.map(s => ({
                id: s.id,
                business_id: business.id,
                name: s.name,
                duration: s.duration,
                price: s.price
            }));

            const { error: servicesError } = await supabase
                .from('services')
                .insert(servicesToInsert);

            if (servicesError) console.error('Error inserting services:', servicesError);
        }

        // 3. Insert courts if any (Delete existing first)
        if (businessData.courts && businessData.courts.length > 0) {
            // Delete existing courts for this business
            await supabase.from('courts').delete().eq('business_id', business.id);

            const courtsToInsert = businessData.courts.map(c => ({
                id: c.id,
                business_id: business.id,
                name: c.name,
                sport: c.sport,
                price: c.price
            }));

            const { error: courtsError } = await supabase
                .from('courts')
                .insert(courtsToInsert);

            if (courtsError) console.error('Error inserting courts:', courtsError);
        }

        return business;
    }

    async updateBusiness(businessId, businessData) {
        // 1. Update business
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .update({
                name: businessData.name,
                category: businessData.category,
                type: businessData.type,
                image: businessData.image || businessData.logo,
                logo: businessData.logo,
                banner_image: businessData.banner_image,
                location: businessData.location,
                latitude: businessData.latitude,
                longitude: businessData.longitude,
                rating: businessData.rating || 0,
                theme: businessData.theme || 'light',
                amenities: businessData.amenities || [],
                hours: businessData.hours,
                sport_types: businessData.sportTypes || []
            })
            .eq('id', businessId)
            .select()
            .single();

        if (businessError) throw businessError;

        // 2. Update services if any (Delete existing first)
        if (businessData.services && businessData.services.length > 0) {
            await supabase.from('services').delete().eq('business_id', businessId);

            const servicesToInsert = businessData.services.map(s => ({
                id: s.id,
                business_id: businessId,
                name: s.name,
                duration: s.duration,
                price: s.price
            }));

            const { error: servicesError } = await supabase
                .from('services')
                .insert(servicesToInsert);

            if (servicesError) console.error('Error inserting services:', servicesError);
        } else {
            // If no services provided, delete all existing services
            await supabase.from('services').delete().eq('business_id', businessId);
        }

        // 3. Update courts if any (Delete existing first)
        if (businessData.courts && businessData.courts.length > 0) {
            await supabase.from('courts').delete().eq('business_id', businessId);

            const courtsToInsert = businessData.courts.map(c => ({
                id: c.id,
                business_id: businessId,
                name: c.name,
                sport: c.sport,
                price: c.price
            }));

            const { error: courtsError } = await supabase
                .from('courts')
                .insert(courtsToInsert);

            if (courtsError) console.error('Error inserting courts:', courtsError);
        } else {
            // If no courts provided, delete all existing courts
            await supabase.from('courts').delete().eq('business_id', businessId);
        }

        return business;
    }

    // --- Bookings ---

    async getBookings(businessId, date = null) {
        let query = supabase
            .from('bookings')
            .select(`
                *,
                services (name),
                courts (name),
                businesses (name)
            `)
            .order('date', { ascending: true });

        if (businessId) {
            query = query.eq('business_id', businessId);
        }

        if (date) {
            query = query.eq('date', date);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { bookings: data }; // Keep structure similar to old service for easier migration
    }

    async createBooking(bookingData) {
        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                business_id: bookingData.businessId,
                service_id: bookingData.serviceId,
                court_id: bookingData.courtId,
                date: bookingData.date instanceof Date
                    ? bookingData.date.toISOString().split('T')[0]
                    : bookingData.date,
                time: bookingData.time,
                customer_name: bookingData.customerName,
                customer_phone: bookingData.customerPhone,
                status: bookingData.status || 'confirmed',
                price: bookingData.price
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateBookingStatus(id, status) {
        const { data, error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async cancelBooking(id) {
        return this.updateBookingStatus(id, 'cancelled');
    }

    // --- Promotions ---

    async getPromotions() {
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

    async createPromotion(promotionData) {
        const { data, error } = await supabase
            .from('promotions')
            .insert([promotionData])
            .select();

        if (error) throw error;
        return data[0];
    }

    async deletePromotion(promotionId) {
        const { error } = await supabase
            .from('promotions')
            .delete()
            .eq('id', promotionId);

        if (error) throw error;
        return true;
    }

    // --- Storage ---

    getPublicUrl(path) {
        const { data } = supabase.storage.from('business-images').getPublicUrl(path);
        return data.publicUrl;
    }

    async uploadImage(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error } = await supabase.storage.from('business-images').upload(filePath, file);

        if (error) throw error;
        return this.getPublicUrl(filePath);
    }
}

export default new SupabaseService();
