
import { supabase } from './supabaseClient';

class SupabaseService {

    // --- Businesses ---

    async getBusinesses() {
        const { data, error } = await supabase
            .from('businesses')
            .select(`
                *,
                services (*),
                courts (*),
                specialists (*)
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

        // Fetch specialists separately for this business
        const { data: specialists } = await supabase
            .from('specialists')
            .select('*')
            .eq('business_id', id);

        // Map specialist_id and full specialist data to services
        if (data.services && specialists) {
            data.services = data.services.map(service => {
                // Extract specialist from the nested service_specialists join table
                const serviceSpecialistRelation = service.service_specialists?.[0];
                const nestedSpecialist = serviceSpecialistRelation?.specialists;
                const specialistId = nestedSpecialist?.id || serviceSpecialistRelation?.specialist_id || '';

                // Find the full specialist object from our specialists list
                const specialist = specialists.find(s => s.id === specialistId);

                return {
                    ...service,
                    specialist_id: specialistId,
                    specialist: specialist || null // Add full specialist object
                };
            });
        }

        // Add specialists to the business data
        data.specialists = specialists || [];

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
                sport_types: businessData.sportTypes || [],
                button_color: businessData.buttonColor || businessData.button_color,
                instagram: businessData.instagram,
                facebook: businessData.facebook,
                whatsapp: businessData.whatsapp,
                primary_color: businessData.primaryColor || businessData.button_color,
                service_categories: businessData.service_categories || [],
                time_ranges: businessData.time_ranges || []
            }])
            .select()
            .single();

        if (businessError) throw businessError;

        // 2. Insert services if any (Delete existing first to avoid duplicates on re-seed)
        if (businessData.services && businessData.services.length > 0) {
            // Delete existing services for this business
            await supabase.from('services').delete().eq('business_id', business.id);

            const servicesToInsert = businessData.services.map(s => ({
                business_id: business.id,
                name: s.name,
                duration: s.duration,
                price: s.price,
                image_url: s.image || s.image_url,
                description: s.description,
                category: s.category
            }));

            const { data: insertedServices, error: servicesError } = await supabase
                .from('services')
                .insert(servicesToInsert)
                .select();

            if (servicesError) {
                console.error('Error inserting services:', servicesError);
            } else if (insertedServices) {
                // Create service-specialist associations using real service IDs
                const serviceSpecialistAssociations = [];

                // Map original services to inserted services by matching name and price
                businessData.services.forEach((originalService, index) => {
                    if (originalService.specialist_id && insertedServices[index]) {
                        serviceSpecialistAssociations.push({
                            service_id: insertedServices[index].id, // Use real ID from database
                            specialist_id: originalService.specialist_id
                        });
                    }
                });

                if (serviceSpecialistAssociations.length > 0) {
                    const { error: assocError } = await supabase
                        .from('service_specialists')
                        .insert(serviceSpecialistAssociations);

                    if (assocError) console.error('Error creating service-specialist associations:', assocError);
                }
            }
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

        // 4. Insert specialists if any (for service-type businesses)
        if (businessData.specialists && businessData.specialists.length > 0) {
            // Delete existing specialists for this business
            await supabase.from('specialists').delete().eq('business_id', business.id);

            const specialistsToInsert = businessData.specialists.map(sp => ({
                business_id: business.id,
                name: sp.name,
                role: sp.role,
                avatar_url: sp.avatar_url
            }));

            const { data: insertedSpecialists, error: specialistsError } = await supabase
                .from('specialists')
                .insert(specialistsToInsert)
                .select();

            if (specialistsError) {
                console.error('Error inserting specialists:', specialistsError);
            } else {
                // Create service-specialist associations (if any were missed above or for new specialists)
                // Note: The main associations are handled in step 2, this is a fallback or for direct specialist assignment if logic changes
            }
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
                sport_types: businessData.sportTypes || [],
                button_color: businessData.buttonColor || businessData.button_color,
                instagram: businessData.instagram,
                facebook: businessData.facebook,
                whatsapp: businessData.whatsapp,
                primary_color: businessData.primaryColor || businessData.button_color,
                service_categories: businessData.service_categories || [],
                time_ranges: businessData.time_ranges || []
            })
            .eq('id', businessId)
            .select()
            .single();

        if (businessError) throw businessError;

        // 2. Update services


        // Declare these outside to use later for associations
        let servicesToUpdate = [];
        let servicesToInsert = [];
        const serviceSpecialistMap = new Map(); // Track specialist_id for each service (by ID for updates)
        const newServiceSpecialists = []; // Track specialist_id for new services by index

        if (businessData.services) {
            // A. Get current services from DB to identify deletions
            const { data: currentServices } = await supabase
                .from('services')
                .select('id')
                .eq('business_id', businessId);

            const currentIds = currentServices ? currentServices.map(s => s.id) : [];
            const incomingIds = businessData.services
                .filter(s => s.id && s.id.length === 36) // Filter valid UUIDs
                .map(s => s.id);

            // B. Identify IDs to delete (present in DB but not in incoming data)
            const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('services')
                    .delete()
                    .in('id', idsToDelete);

                if (deleteError) console.error('Error deleting removed services:', deleteError);
            }

            // C. Split into Updates (Upsert) and Inserts (New)
            businessData.services.forEach((s, index) => {
                const isNew = !s.id || s.id.length !== 36; // Check if ID is missing or not a UUID (temp ID)

                const serviceData = {
                    business_id: businessId,
                    name: s.name,
                    duration: parseInt(s.duration) || 60,
                    price: parseFloat(s.price) || 0,
                    image_url: s.image || s.image_url,
                    description: s.description,
                    category: s.category
                };

                if (isNew) {
                    // New service: No ID, will be inserted
                    servicesToInsert.push(serviceData);
                    // Track specialist for this new service (by index in servicesToInsert)
                    newServiceSpecialists.push(s.specialist_id);
                } else {
                    // Existing service: Keep ID, will be upserted
                    serviceData.id = s.id;
                    servicesToUpdate.push(serviceData);
                    // Track specialist for this existing service
                    if (s.specialist_id) {
                        serviceSpecialistMap.set(s.id, s.specialist_id);
                    }
                }
            });



            // D. Execute Updates
            if (servicesToUpdate.length > 0) {
                const { error: updateError } = await supabase
                    .from('services')
                    .upsert(servicesToUpdate);

                if (updateError) console.error('Error updating services:', updateError);
            }

            // E. Execute Inserts
            if (servicesToInsert.length > 0) {
                const { data: insertedServices, error: insertError } = await supabase
                    .from('services')
                    .insert(servicesToInsert)
                    .select();

                if (insertError) {
                    console.error('Error inserting new services:', insertError);
                } else if (insertedServices) {


                    // Add the newly inserted services to the map for association creation
                    insertedServices.forEach((insertedService, index) => {
                        const specialistId = newServiceSpecialists[index];
                        if (specialistId) {

                            serviceSpecialistMap.set(insertedService.id, specialistId);
                        }
                    });
                }
            }
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

        // 4. Update specialists if any (for service-type businesses)
        if (businessData.specialists) {
            // A. Get current specialists from DB to identify deletions
            const { data: currentSpecialists } = await supabase
                .from('specialists')
                .select('id')
                .eq('business_id', businessId);

            const currentIds = currentSpecialists ? currentSpecialists.map(sp => sp.id) : [];
            const incomingIds = businessData.specialists
                .filter(sp => sp.id && sp.id.length === 36) // Filter valid UUIDs
                .map(sp => sp.id);

            // B. Identify IDs to delete
            const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

            if (idsToDelete.length > 0) {
                // Delete service-specialist associations first
                await supabase
                    .from('service_specialists')
                    .delete()
                    .in('specialist_id', idsToDelete);

                // Then delete specialists
                const { error: deleteError } = await supabase
                    .from('specialists')
                    .delete()
                    .in('id', idsToDelete);

                if (deleteError) console.error('Error deleting removed specialists:', deleteError);
            }

            // C. Split into Updates and Inserts
            const specialistsToUpdate = [];
            const specialistsToInsert = [];

            businessData.specialists.forEach(sp => {
                const isNew = !sp.id || sp.id.length !== 36;

                const specialistData = {
                    business_id: businessId,
                    name: sp.name,
                    role: sp.role,
                    avatar_url: sp.avatar_url
                };

                if (isNew) {
                    specialistsToInsert.push(specialistData);
                } else {
                    specialistData.id = sp.id;
                    specialistsToUpdate.push(specialistData);
                }
            });

            // D. Execute Updates
            if (specialistsToUpdate.length > 0) {
                const { error: updateError } = await supabase
                    .from('specialists')
                    .upsert(specialistsToUpdate);

                if (updateError) console.error('Error updating specialists:', updateError);
            }

            // E. Execute Inserts
            if (specialistsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('specialists')
                    .insert(specialistsToInsert);

                if (insertError) console.error('Error inserting new specialists:', insertError);
            }

            // F. Update service-specialist associations
            // Delete all existing associations for this business's services
            if (businessData.services) {
                // Get all service IDs (both existing and newly created)
                const { data: allServices } = await supabase
                    .from('services')
                    .select('id')
                    .eq('business_id', businessId);

                const serviceIds = allServices?.map(s => s.id) || [];

                if (serviceIds.length > 0) {
                    await supabase
                        .from('service_specialists')
                        .delete()
                        .in('service_id', serviceIds);

                    // Create new associations using the map
                    const serviceSpecialistAssociations = [];

                    serviceSpecialistMap.forEach((specialistId, serviceId) => {
                        serviceSpecialistAssociations.push({
                            service_id: serviceId,
                            specialist_id: specialistId
                        });
                    });

                    if (serviceSpecialistAssociations.length > 0) {
                        const { error: assocError } = await supabase
                            .from('service_specialists')
                            .insert(serviceSpecialistAssociations);

                        if (assocError) {
                            console.error('Error creating service-specialist associations:', assocError);
                        }
                    }
                }
            }
        }

        return business;
    }
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

        // Map court_id or service_id to resource_id for consistent availability checking
        const bookingsWithResourceId = data?.map(booking => ({
            ...booking,
            resource_id: booking.court_id || booking.service_id
        })) || [];

        return { bookings: bookingsWithResourceId };
    }

    async createBooking(bookingData) {
        // Helper function to convert Date to YYYY-MM-DD in local timezone (not UTC)
        const formatDateLocal = (date) => {
            if (!date) return null;
            if (typeof date === 'string') return date; // Already a string
            // Use local date components to avoid timezone conversion issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                business_id: bookingData.businessId,
                service_id: bookingData.serviceId,
                court_id: bookingData.courtId,
                date: formatDateLocal(bookingData.date),
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
