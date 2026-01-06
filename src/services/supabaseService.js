
import { supabase } from './supabaseClient';

class SupabaseService {
    // --- Helpers ---
    _processBusinessData(data) {
        if (!data) return data;
        if (Array.isArray(data)) {
            return data.map(item => this._processBusinessData(item));
        }

        const business = { ...data };
        // Ensure hours is an object if it comes as a stringified JSON
        if (typeof business.hours === 'string' && business.hours.trim().startsWith('{')) {
            try {
                business.hours = JSON.parse(business.hours);
            } catch (e) {
                console.error('Error parsing business hours JSON:', e);
            }
        }
        return business;
    }

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
        return this._processBusinessData(data);
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

        return this._processBusinessData(data);
    }

    async login(email, password) {
        // NOTE: This assumes a 'password' and 'email' column exists in the 'businesses' table.
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error || !data) {
            throw new Error('Credenciales inválidas');
        }

        return this._processBusinessData(data);
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
                time_ranges: businessData.time_ranges || [],
                // Venue-specific fields
                price_per_hour: businessData.price_per_hour,
                rental_duration_options: businessData.rental_duration_options || [],
                additional_services: businessData.additional_services || [],
                included_amenities: businessData.included_amenities || [],
                gallery_images: businessData.gallery_images || [],
                max_capacity: businessData.max_capacity || 1
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
                time_ranges: businessData.time_ranges || [],
                // Venue-specific fields
                price_per_hour: businessData.price_per_hour,
                rental_duration_options: businessData.rental_duration_options || [],
                additional_services: businessData.additional_services || [],
                included_amenities: businessData.included_amenities || [],
                gallery_images: businessData.gallery_images || [],
                max_capacity: businessData.max_capacity || 1
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

    async patchBusiness(businessId, updates) {
        // Only update specific fields provided in 'updates'
        // Filter out non-DB fields to be safe (arrays, relations)
        const safeUpdates = { ...updates };
        const blockedFields = ['id', 'created_at', 'services', 'courts', 'bookings', 'customers', 'specialists'];
        blockedFields.forEach(field => delete safeUpdates[field]);

        // Stringify complex objects for TEXT columns if necessary
        if (safeUpdates.hours && typeof safeUpdates.hours === 'object') {
            safeUpdates.hours = JSON.stringify(safeUpdates.hours);
        }

        // 1. Update main business table if there are fields left
        if (Object.keys(safeUpdates).length > 0) {
            const { error } = await supabase
                .from('businesses')
                .update(safeUpdates)
                .eq('id', businessId);

            if (error) throw error;
        }

        // 2. Handle Courts update
        if (updates.courts) {
            // Delete existing courts
            await supabase.from('courts').delete().eq('business_id', businessId);

            if (updates.courts.length > 0) {
                const courtsToInsert = updates.courts.map(c => ({
                    id: c.id,
                    business_id: businessId,
                    name: c.name,
                    sport: c.sport,
                    price: c.price
                }));

                const { error: courtsError } = await supabase
                    .from('courts')
                    .insert(courtsToInsert);

                if (courtsError) console.error('Error updating courts in patch:', courtsError);
            }
        }

        // 3. Handle Specialists update
        if (updates.specialists) {
            // A. Get current specialists to identify deletions
            const { data: currentSpecialists } = await supabase
                .from('specialists')
                .select('id')
                .eq('business_id', businessId);

            const currentIds = currentSpecialists ? currentSpecialists.map(sp => sp.id) : [];
            const incomingIds = updates.specialists
                .filter(sp => sp.id && sp.id.length >= 32)
                .map(sp => sp.id);

            // B. Delete removed specialists
            const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));
            if (idsToDelete.length > 0) {
                await supabase.from('service_specialists').delete().in('specialist_id', idsToDelete);
                await supabase.from('specialists').delete().in('id', idsToDelete);
            }

            // C. Upsert (Update or Insert)
            const specialistsToUpsert = updates.specialists.map(sp => ({
                id: sp.id,
                business_id: businessId,
                name: sp.name,
                role: sp.role,
                avatar_url: sp.avatar_url
            }));

            if (specialistsToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('specialists')
                    .upsert(specialistsToUpsert);

                if (upsertError) console.error('Error upserting specialists in patch:', upsertError);
            }
        }

        // Return null data to avoid heavy read timeouts (e.g. if logo is base64)
        return null;
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
            .order('created_at', { ascending: false });

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

        // Resolve resource_id: if not provided, try to map from legacy IDs
        let finalResourceId = bookingData.resourceId;

        if (!finalResourceId && (bookingData.courtId || bookingData.serviceId)) {
            const legacyId = bookingData.courtId || bookingData.serviceId;
            const type = bookingData.serviceId ? 'service' : 'court';

            try {
                // Query resources table - fetch all resources for this business/type to match in JS
                // This is safer than complex .or() filtering on JSONB columns which can be flaky
                const { data: resources } = await supabase
                    .from('resources')
                    .select('id, metadata')
                    .eq('business_id', bookingData.businessId)
                    .eq('type', type);

                if (resources && resources.length > 0) {
                    const strLegacyId = String(legacyId);
                    const match = resources.find(r => {
                        const metaOriginal = r.metadata?.original_id;
                        const metaOldCourt = r.metadata?.old_court_id;
                        const metaOldService = r.metadata?.old_service_id;

                        // Check exact string match or loose equality
                        const matchOriginal = metaOriginal && (String(metaOriginal) === strLegacyId || metaOriginal == legacyId);
                        const matchOldCourt = metaOldCourt && (String(metaOldCourt) === strLegacyId || metaOldCourt == legacyId);
                        const matchOldService = metaOldService && (String(metaOldService) === strLegacyId || metaOldService == legacyId);

                        return matchOriginal || matchOldCourt || matchOldService;
                    });

                    if (match) {
                        finalResourceId = match.id;
                    } else {
                        console.warn(`❌ Resource not found for legacy ID: ${legacyId}. Checked ${resources.length} resources.`);
                        finalResourceId = legacyId;
                    }
                } else {
                    console.warn('❌ No resources found for this business/type');
                    finalResourceId = legacyId;
                }

            } catch (err) {
                console.warn('Error resolving resource_id:', err);
                finalResourceId = legacyId;
            }
        }

        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                business_id: bookingData.businessId,
                service_id: bookingData.serviceId,
                court_id: bookingData.courtId,
                specialist_id: bookingData.specialistId || null,
                resource_id: finalResourceId,
                date: formatDateLocal(bookingData.date),
                time: bookingData.time,
                customer_name: bookingData.customerName ? bookingData.customerName.toUpperCase() : bookingData.customerName,
                customer_phone: bookingData.customerPhone,
                status: bookingData.status || 'confirmed',
                price: bookingData.price,
                duration: bookingData.duration,
                metadata: bookingData.metadata
            }])
            .select()
            .single();

        if (error) throw error;
        return this._processBusinessData(data);
    }

    async updateBookingStatus(id, status, metadata = {}) {
        const updateData = {
            status,
            updated_at: new Date().toISOString()
        };

        if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString();
        if (status === 'cancelled') {
            updateData.cancelled_at = new Date().toISOString();
            updateData.cancellation_reason = metadata.reason;
        }
        if (status === 'deposit_paid') updateData.deposit_paid_at = new Date().toISOString();
        if (status === 'completed') updateData.completed_at = new Date().toISOString();

        // Handle history if provided in metadata
        if (metadata.history) {
            updateData.history = metadata.history;
        }

        const { data, error } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this._processBusinessData(data);
    }

    async moveBooking(id, newDate, newTime, newItemId) {
        // We need to know if the business is service or venue/sport
        // to update correctly court_id or service_id.
        // For simplicity, we check the current booking or just try to 
        // update based on the ID format or provided type.
        // Usually, we can just update both and Supabase will handle the schema.

        const updateData = {
            date: newDate,
            time: newTime,
            updated_at: new Date().toISOString()
        };

        // Heuristic: if newItemId looks like it might be a court or service
        // In this app, many IDs are UUIDs. 
        // We'll try to find if it's a service or court first or just pass both 
        // if we are not sure, but better to be precise.

        // Let's get the booking first to see its type
        const { data: currentBooking } = await supabase
            .from('bookings')
            .select('court_id, service_id')
            .eq('id', id)
            .single();

        if (currentBooking) {
            if (currentBooking.court_id) {
                updateData.court_id = newItemId;
            } else if (currentBooking.service_id) {
                updateData.service_id = newItemId;
            }
        }

        const { data, error } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this._processBusinessData(data);
    }

    async cancelBooking(id, reason = '') {
        return this.updateBookingStatus(id, 'cancelled', { reason });
    }

    async deleteBooking(id) {
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // --- Realtime Subscriptions ---

    subscribeToBookings(businessId, callback) {
        return supabase
            .channel(`bookings-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `business_id=eq.${businessId}`
                },
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();
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
        return this._processBusinessData(data);
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

    // --- Customers (CRM) ---

    async getCustomers(businessId) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('business_id', businessId)
            .order('name', { ascending: true });

        if (error) throw error;
        return this._processBusinessData(data);
    }

    async updateCustomer(customerId, customerData) {
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
        return this._processBusinessData(data);
    }

    async getCustomerBookings(businessId, customerPhone) {
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
        return this._processBusinessData(data);
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

    // ============================================================================
    // RESOURCES MANAGEMENT (New Schema)
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

export default new SupabaseService();
