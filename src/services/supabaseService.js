
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
                categories (
                    id,
                    name,
                    slug,
                    icon
                ),
                business_subcategories (
                    subcategories (
                        id,
                        name,
                        slug,
                        icon,
                        category_id
                    )
                ),
                services (*),
                courts (*),
                specialists (*)
            `);

        if (error) throw error;

        // Transform data to flatten subcategories array
        const businesses = data.map(b => {
            // Get subcategories from M:N relationship
            const subcategories = b.business_subcategories?.map(bs => bs.subcategories) || [];

            return {
                ...b,
                subcategories
            };
        });

        return this._processBusinessData(businesses);
    }

    async getNearbyBusinesses(lat, lng, radius = 5000) {
        const { data, error } = await supabase
            .rpc('get_nearby_businesses', {
                user_lat: lat,
                user_lng: lng,
                radius_meters: radius
            });

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
        // 1. Prepare business data
        const businessRecord = {
            name: businessData.name,
            category_id: businessData.category_id, // UUID reference to categories table
            subcategory_id: businessData.subcategory_id, // UUID reference to subcategories table
            subscription_plan_id: businessData.subscription_plan_id, // UUID reference to subscription_plans table
            type: businessData.type,
            email: businessData.email, // Auto-generated email
            password: businessData.password, // Default password
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
        };

        // Add id only if provided (for updates)
        if (businessData.id) {
            businessRecord.id = businessData.id;
        }

        // Use upsert if id exists (update), otherwise insert (create new)
        const { data: business, error: businessError } = businessData.id
            ? await supabase.from('businesses').upsert([businessRecord]).select().single()
            : await supabase.from('businesses').insert([businessRecord]).select().single();

        if (businessError) throw businessError;

        // 1.5 Create default subscription IMMEDIATELY (Critical for triggers)
        // Without this, triggers checking for business capacity/limits will fail
        await this._createDefaultSubscription(business.id, businessData.subscription_plan_id);

        // 5. Insert subcategories relationships if any
        if (businessData.subcategories && businessData.subcategories.length > 0) {
            // Delete existing subcategory relationships for this business
            await supabase.from('business_subcategories').delete().eq('business_id', business.id);

            const subcategoriesToInsert = businessData.subcategories.map(subId => ({
                business_id: business.id,
                subcategory_id: subId
            }));

            const { error: subcategoriesError } = await supabase
                .from('business_subcategories')
                .insert(subcategoriesToInsert);

            if (subcategoriesError) {
                console.error('Error inserting subcategories:', subcategoriesError);
                throw new Error(`Error guardando subcategorías: ${subcategoriesError.message}`);
            }
        }

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

        // 3. Insert or Update courts
        if (businessData.courts && businessData.courts.length > 0) {
            // Delete old courts to prevent ID conflicts (safer for overwrite logic)
            await supabase.from('courts').delete().eq('business_id', business.id);

            const courtsToInsert = businessData.courts.map(c => {
                // Generate a valid UUID if ID is missing or temp
                // This fixes "null value in column id" error if DB default is missing
                const isValidUUID = c.id && c.id.toString().length === 36;

                let courtId = isValidUUID ? c.id : null;

                if (!courtId) {
                    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                        courtId = crypto.randomUUID();
                    } else {
                        // Fallback UUID v4 generator
                        courtId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    }
                }

                return {
                    id: courtId,
                    business_id: business.id,
                    name: c.name,
                    sport: c.sport,
                    price: c.price
                };
            });

            console.log('Inserting courts:', courtsToInsert); // Debug log

            const { error: courtsError } = await supabase
                .from('courts')
                .insert(courtsToInsert);

            if (courtsError) {
                console.error('Error inserting courts:', courtsError);
                throw new Error(`Error reservando canchas: ${courtsError.message}`);
            }
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

        // 3. Update courts
        if (businessData.courts) {
            // A. Get current courts from DB to identify deletions
            const { data: currentCourts } = await supabase
                .from('courts')
                .select('id')
                .eq('business_id', businessId);

            const currentIds = currentCourts ? currentCourts.map(c => c.id) : [];
            const incomingIds = businessData.courts
                .map(c => c.id)
                .filter(id => id); // Filter undefined/null IDs

            // B. Identify IDs to delete
            const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('courts')
                    .delete()
                    .in('id', idsToDelete);

                if (deleteError) console.error('Error deleting removed courts:', deleteError);
            }

            // C. Upsert (Insert or Update) remaining courts
            if (businessData.courts.length > 0) {
                const courtsToUpsert = businessData.courts.map(c => {
                    // Check if ID is valid UUID
                    const isValidUUID = c.id && c.id.toString().length === 36;

                    let courtId = isValidUUID ? c.id : null;

                    // Generate new UUID for new courts (temp IDs)
                    if (!courtId) {
                        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                            courtId = crypto.randomUUID();
                        } else {
                            courtId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                return v.toString(16);
                            });
                        }
                    }

                    return {
                        id: courtId,
                        business_id: businessId,
                        name: c.name,
                        sport: c.sport,
                        price: c.price
                    };
                });

                const { error: courtsError } = await supabase
                    .from('courts')
                    .upsert(courtsToUpsert, { onConflict: 'id' });

                if (courtsError) console.error('Error upserting courts:', courtsError);
            }
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
                const courtsToInsert = updates.courts.map(c => {
                    const isValidUUID = c.id && c.id.toString().length === 36;
                    let courtId = isValidUUID ? c.id : null;

                    if (!courtId) {
                        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                            courtId = crypto.randomUUID();
                        } else {
                            courtId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                return v.toString(16);
                            });
                        }
                    }

                    return {
                        id: courtId,
                        business_id: businessId,
                        name: c.name,
                        sport: c.sport,
                        price: c.price
                    };
                });

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

    /**
     * Validate booking availability using database function (BUSINESS-LEVEL)
     * @param {string} businessId - Business ID (UUID)
     * @param {string} startTime - Start time (ISO string)
     * @param {string} endTime - End time (ISO string)
     * @param {string} excludeBookingId - Optional booking ID to exclude from check
     * @returns {Promise<Object>} { available, slots_used, total_capacity }
     */
    async validateBookingAvailability(businessId, startTime, endTime, excludeBookingId = null) {
        const { data, error } = await supabase
            .rpc('check_business_availability', {
                p_business_id: businessId,
                p_start_time: startTime,
                p_end_time: endTime,
                p_exclude_booking_id: excludeBookingId
            });

        if (error) throw error;
        return data[0]; // { available, slots_used, total_capacity }
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

        // Calculate times for validation FIRST
        const dateStr = formatDateLocal(bookingData.date);
        const startTime = `${dateStr}T${bookingData.time}:00`;

        // Calculate end time based on duration (default 60 minutes)
        const duration = bookingData.duration || 60;
        const [hours, minutes] = bookingData.time.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(endMinutes / 60) % 24;
        const endMins = endMinutes % 60;
        const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        const endTime = `${dateStr}T${endTimeStr}:00`;

        // ✅ 1. CHECK RESOURCE AVAILABILITY (Specific Court/Specialist)
        // This prevents double-booking the same resource regardless of business total capacity
        if (finalResourceId) {
            const { data: conflicts, error: conflictError } = await supabase
                .from('bookings')
                .select('id')
                .eq('resource_id', finalResourceId)
                .neq('status', 'cancelled') // Ignore cancelled
                .neq('status', 'rejected')  // Ignore rejected
                .lt('start_time', endTime)  // Overlap logic: Start < NewEnd
                .gt('end_time', startTime); // Overlap logic: End > NewStart

            if (conflictError) {
                console.error('Error checking resource conflict:', conflictError);
                throw conflictError;
            }

            if (conflicts && conflicts.length > 0) {
                throw new Error(`Este turno ya está reservado.`);
            }
        }

        // ✅ 2. VALIDATE BUSINESS-LEVEL CAPACITY (Total concurrency)
        try {
            const availability = await this.validateBookingAvailability(
                bookingData.businessId,
                startTime,
                endTime
            );


            if (!availability.available) {
                throw new Error(
                    `No hay espacios disponibles para este horario. ` +
                    `Ocupados: ${availability.slots_used}/${availability.total_capacity}`
                );
            }

            console.log('✅ Business capacity validated:', availability);
        } catch (validationError) {
            // If validation fails, throw the error to prevent booking creation
            console.error('❌ Business capacity validation failed:', validationError);
            throw validationError;
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
            .order('display_order', { ascending: true });

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
                plan_name: plan.id, // Save ID to match schema consistency (e.g. 'sport_1')
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

        // ✅ UPDATE BUSINESS CAPACITY when subscription changes
        const { error: capacityError } = await supabase
            .from('businesses')
            .update({ capacity: plan.spaces })
            .eq('id', businessId);

        if (capacityError) {
            console.error('Error updating business capacity:', capacityError);
            // Don't throw - subscription was updated successfully
        }

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

    // --- Categories ---

    async getCategories(businessType = null) {
        let query = supabase
            .from('categories')
            .select('*, subcategories(*)')
            .order('display_order', { ascending: true });

        if (businessType) {
            query = query.eq('business_type', businessType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getCategoryById(id) {
        const { data, error } = await supabase
            .from('categories')
            .select('*, subcategories(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async createCategory(categoryData) {
        const { data, error } = await supabase
            .from('categories')
            .insert([{
                name: categoryData.name,
                slug: categoryData.slug,
                icon: categoryData.icon,
                color: categoryData.color,
                business_type: categoryData.business_type,
                display_order: categoryData.display_order || 0
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateCategory(id, categoryData) {
        const { data, error } = await supabase
            .from('categories')
            .update({
                name: categoryData.name,
                slug: categoryData.slug,
                icon: categoryData.icon,
                color: categoryData.color,
                business_type: categoryData.business_type,
                display_order: categoryData.display_order
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteCategory(id) {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // --- Subcategories ---

    async getSubcategories(categoryId = null) {
        let query = supabase
            .from('subcategories')
            .select('*')
            .order('display_order', { ascending: true });

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createSubcategory(subcategoryData) {
        const { data, error } = await supabase
            .from('subcategories')
            .insert([{
                category_id: subcategoryData.category_id,
                name: subcategoryData.name,
                slug: subcategoryData.slug,
                icon: subcategoryData.icon,
                display_order: subcategoryData.display_order || 0
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateSubcategory(id, subcategoryData) {
        const { data, error } = await supabase
            .from('subcategories')
            .update({
                name: subcategoryData.name,
                slug: subcategoryData.slug,
                icon: subcategoryData.icon,
                display_order: subcategoryData.display_order
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteSubcategory(id) {
        const { error } = await supabase
            .from('subcategories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // --- Subscription Plans ---

    async getSubscriptionPlanById(id) {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }
    // --- Internal Helpers ---

    async _createDefaultSubscription(businessId, planId = null) {
        try {
            // Get Plan (use provided ID or find Basic)
            let plan;
            if (planId) {
                const { data } = await supabase.from('subscription_plans').select('*').eq('id', planId).single();
                plan = data;
            } else {
                // Fallback to basic if no plan provided
                // Note: Column is price_monthly in new schema, was monthly_price in old
                const { data } = await supabase.from('subscription_plans').select('*').order('price_monthly', { ascending: true }).limit(1).single();
                plan = data;
            }

            if (!plan) {
                console.warn('No subscription plan found for default assignment.');
                throw new Error('No subscription plan found');
            }

            // Create Subscription
            const startDate = new Date();
            const nextBilling = new Date();
            nextBilling.setMonth(nextBilling.getMonth() + 1);

            const { error } = await supabase.from('subscriptions').insert([{
                business_id: businessId,
                plan_name: plan.id, // Using plan ID as name ref for consistency
                status: 'active',
                spaces_included: plan.spaces_included, // Correct column from subscription_plans
                monthly_price: plan.price_monthly, // Correct column mapping
                billing_start: startDate.toISOString(),
                next_billing_date: nextBilling.toISOString()
            }]);

            if (error) throw error;

            // Update Business Capacity
            await supabase.from('businesses').update({ capacity: plan.spaces_included }).eq('id', businessId);

        } catch (error) {
            console.error('Error creating default subscription:', error);
            throw error; // Block creation if subscription fails (critical for triggers)
        }
    }
}

export default new SupabaseService();

