
import { supabase } from './supabaseClient';

class SupabaseService {
    // --- Helpers ---
    _processBusinessData(data) {
        if (!data) return data;
        if (Array.isArray(data)) {
            return data.map(item => this._processBusinessData(item));
        }

        const business = { ...data };

        // 🔍 DEBUG: Log para ver datos crudos de Supabase
        console.log('🔍 _processBusinessData received:', {
            payment_settings: business.payment_settings,
            payment_settings_type: typeof business.payment_settings
        });

        // Ensure hours is an object if it comes as a stringified JSON
        if (typeof business.hours === 'string' && business.hours.trim().startsWith('{')) {
            try {
                business.hours = JSON.parse(business.hours);
            } catch (e) {
                console.error('Error parsing business hours JSON:', e);
            }
        }

        // Ensure payment_settings is an object if it comes as a stringified JSON
        if (typeof business.payment_settings === 'string' && business.payment_settings.trim().startsWith('{')) {
            try {
                business.payment_settings = JSON.parse(business.payment_settings);
            } catch (e) {
                console.error('Error parsing payment_settings JSON:', e);
            }
        }
        // If payment_settings is already an object (from JSONB), keep it as is
        // If it's null or undefined, set to empty object
        if (!business.payment_settings || typeof business.payment_settings !== 'object') {
            business.payment_settings = {};
        }

        console.log('🔍 _processBusinessData result:', {
            payment_settings: business.payment_settings,
            has_deposit: !!business.payment_settings?.deposit,
            has_bank_details: !!business.payment_settings?.bank_details
        });

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

    async getBusinessBySlug(slug) {
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
            `)
            .eq('slug', slug)
            .single();

        if (error) throw error;

        // Fetch specialists separately for this business to ensure complete data
        const { data: specialists } = await supabase
            .from('specialists')
            .select('*')
            .eq('business_id', data.id);

        if (data.services && specialists) {
            data.services = data.services.map(service => {
                const serviceSpecialistRelation = service.service_specialists?.[0];
                const nestedSpecialist = serviceSpecialistRelation?.specialists;
                const specialistId = nestedSpecialist?.id || serviceSpecialistRelation?.specialist_id || '';
                const specialist = specialists.find(s => s.id === specialistId);
                return {
                    ...service,
                    specialist_id: specialistId,
                    specialist: specialist || null
                };
            });
        }

        data.specialists = specialists || [];

        // Flatten subcategories similarly to getBusinesses
        const subcategories = data.business_subcategories?.map(bs => bs.subcategories) || [];
        data.subcategories = subcategories;

        return this._processBusinessData(data);
    }

    async login(email, password) {
        // Use the secure RPC function to bypass RLS for login
        const { data, error } = await supabase.rpc('login_business', {
            p_email: email,
            p_password: password
        });

        if (error) {
            console.error('Login RPC error:', error);
            throw new Error('Error al iniciar sesión');
        }

        if (!data) {
            throw new Error('Credenciales inválidas');
        }

        // Return the business data directly as RPC returns the record
        // Add flags for first login and subscription status
        return {
            ...this._processBusinessData(data),
            requirePasswordChange: !data.password_changed,
            subscriptionStatus: data.subscription_status,
            trialEndDate: data.trial_end_date
        };
    }

    async createBusiness(businessData) {
        // Ensure subcategory_id is added to subcategories array for relationship saving
        if (businessData.subcategory_id && (!businessData.subcategories || businessData.subcategories.length === 0)) {
            businessData.subcategories = [businessData.subcategory_id];
        }

        // 1. Prepare business data
        const businessRecord = {
            name: businessData.name,
            category_id: businessData.category_id, // UUID reference to categories table
            // subcategory_id removed as it doesn't exist in businesses table
            subscription_plan_id: businessData.subscription_plan_id, // UUID reference to subscription_plans table
            type: businessData.type,
            email: businessData.email, // Auto-generated email
            password: businessData.password, // Default password
            seller_id: businessData.seller_id, // Link to seller who created it
            logo_url: businessData.logo_url || businessData.logo || businessData.image, // Use new column name
            banner_url: businessData.banner_url || businessData.banner_image, // Use new column name
            location: businessData.location,
            latitude: businessData.latitude,
            longitude: businessData.longitude,
            rating: businessData.rating || 0,
            theme: businessData.theme || 'light',
            amenities: businessData.amenities || [],
            hours: businessData.hours,
            button_color: businessData.buttonColor || businessData.button_color || '#3b82f6',
            instagram: businessData.instagram,
            facebook: businessData.facebook,
            whatsapp: businessData.whatsapp,
            primary_color: businessData.primaryColor || businessData.button_color || '#3b82f6',
            // Venue-specific fields
            price_per_hour: businessData.price_per_hour,
            pricing_model: businessData.pricing_model || 'hourly',
            price_per_day: businessData.price_per_day,
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
        const blockedFields = ['id', 'created_at', 'courts', 'bookings', 'customers', 'specialists', 'services'];
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

        // 3. Handle Services update
        if (updates.services) {
            // A. Get current services to identify deletions
            const { data: currentServices } = await supabase
                .from('services')
                .select('id')
                .eq('business_id', businessId);

            const currentIds = currentServices ? currentServices.map(s => s.id) : [];
            const incomingIds = updates.services
                .filter(s => s.id && s.id.length >= 32)
                .map(s => s.id);

            // B. Delete removed services (only those explicitly removed)
            const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));
            if (idsToDelete.length > 0) {
                // First delete referencing service_specialists to be safe (though cascade likely handles it)
                await supabase.from('service_specialists').delete().in('service_id', idsToDelete);

                // Then delete the services
                const { error: deleteError } = await supabase
                    .from('services')
                    .delete()
                    .in('id', idsToDelete);

                if (deleteError) {
                    console.error('Error deleting removed services:', deleteError);
                    // If delete fails (e.g. due to bookings), we should probably warn or handle it, 
                    // but for now we proceed to upsert the others.
                }
            }

            if (updates.services.length > 0) {
                const servicesToUpsert = updates.services.map(s => {
                    const isValidUUID = s.id && s.id.toString().length === 36;
                    let serviceId = isValidUUID ? s.id : null;

                    if (!serviceId) {
                        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                            serviceId = crypto.randomUUID();
                        } else {
                            serviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                                return v.toString(16);
                            });
                        }
                    }

                    return {
                        id: serviceId,
                        business_id: businessId,
                        name: s.name,
                        price: s.price,
                        duration: s.duration,
                        description: s.description,
                        category: s.category,
                        image_url: s.image_url || null
                    };
                });

                const { error: servicesError } = await supabase
                    .from('services')
                    .upsert(servicesToUpsert); // Use UPSERT instead of INSERT

                if (servicesError) console.error('Error updating services in patch:', servicesError);
            }
        }

        // 4. Handle service_categories update (stored in businesses table)
        if (updates.service_categories !== undefined) {
            const { error: categoriesError } = await supabase
                .from('businesses')
                .update({ service_categories: updates.service_categories })
                .eq('id', businessId);

            if (categoriesError) console.error('Error updating service_categories:', categoriesError);
        }

        // 5. Handle Specialists update
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
        const updateData = {
            date: newDate,
            time: newTime,
            updated_at: new Date().toISOString()
        };

        // If a new resource ID is provided, we must determine if it's a court or service
        // to update the correct foreign key column and clear the other one.
        if (newItemId) {
            try {
                // 1. Check if it's a court
                const { data: court } = await supabase
                    .from('courts')
                    .select('id')
                    .eq('id', newItemId)
                    .maybeSingle();

                if (court) {
                    updateData.court_id = newItemId;
                    updateData.service_id = null; // Clear service_id to avoid FK violation
                    updateData.resource_id = newItemId; // Keeps unified resource_id in sync
                } else {
                    // 2. Check if it's a service
                    const { data: service } = await supabase
                        .from('services')
                        .select('id')
                        .eq('id', newItemId)
                        .maybeSingle();

                    if (service) {
                        updateData.service_id = newItemId;
                        updateData.court_id = null; // Clear court_id
                        updateData.resource_id = newItemId;
                    } else {
                        console.warn(`⚠️ moveBooking: Resource ID ${newItemId} not found in courts or services.`);
                    }
                }
            } catch (err) {
                console.error('Error verifying resource type in moveBooking:', err);
                // Fallback: Do not update IDs if verification fails, just date/time
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

    // ============================================================================
    // SELLER PORTAL FUNCTIONS
    // ============================================================================

    /**
     * Authenticate seller
     * @param {string} email - Seller email
     * @param {string} password - Seller password
     * @returns {Promise<Object>} Seller data
     */
    async loginSeller(email, password) {
        const { data, error } = await supabase
            .from('sellers')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            throw new Error('Credenciales inválidas');
        }

        return data;
    }

    /**
     * Get all businesses for a seller
     * @param {string} sellerId - Seller ID
     * @returns {Promise<Array>} List of businesses with metrics
     */
    async getSellerBusinesses(sellerId) {
        const { data, error } = await supabase
            .from('businesses')
            .select(`
                *,
                categories (name, icon),
                subcategories (name),
                subscription_plans (name, price_monthly)
            `)
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Add metrics for each business
        const businessesWithMetrics = await Promise.all((data || []).map(async (business) => {
            // Get subscription month
            let subscriptionMonth = 0;
            if (business.subscription_start_date) {
                const startDate = new Date(business.subscription_start_date);
                const now = new Date();
                const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 +
                    (now.getMonth() - startDate.getMonth()) + 1;
                subscriptionMonth = Math.max(1, monthsDiff);
            }

            // Get total bookings count
            const { count: bookingsCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', business.id);

            return {
                ...business,
                subscriptionMonth,
                totalBookings: bookingsCount || 0
            };
        }));

        return businessesWithMetrics;
    }

    /**
     * Create business by seller
     * @param {string} sellerId - Seller ID
     * @param {Object} businessData - Business data
     * @returns {Promise<Object>} Created business
     */
    async createBusinessBySeller(sellerId, businessData) {
        // Fix for legacy default "1" or missing plan
        let planId = businessData.subscription_plan_id;
        if (!planId || planId === '1') {
            try {
                const { data: plans } = await supabase
                    .from('subscription_plans')
                    .select('id')
                    .limit(1);

                if (plans && plans.length > 0) {
                    planId = plans[0].id;
                }
            } catch (err) {
                console.error("Error fetching default plan:", err);
            }
        }

        // Generate email from business name (logic matched with Frontend SellerBusinessForm)
        const sanitizedName = businessData.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, ''); // Remove special chars but keep hyphens

        const email = `${sanitizedName}@turnitoslr.com`;
        const password = 'admin123';

        // Set trial dates
        const trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 15);

        // Add seller-specific fields
        const businessWithSellerData = {
            ...businessData,
            subscription_plan_id: planId, // Ensure valid UUID
            seller_id: sellerId,
            email,
            password,
            password_changed: false,
            trial_start_date: trialStartDate.toISOString(),
            trial_end_date: trialEndDate.toISOString(),
            subscription_status: 'trial'
        };

        // Use existing createBusiness function
        return await this.createBusiness(businessWithSellerData);
    }

    /**
     * Update business by seller (with permission check)
     * @param {string} sellerId - Seller ID
     * @param {string} businessId - Business ID
     * @param {Object} businessData - Business data to update
     * @returns {Promise<Object>} Updated business
     */
    async updateBusinessBySeller(sellerId, businessId, businessData) {
        // Verify seller owns this business
        const { data: business, error: checkError } = await supabase
            .from('businesses')
            .select('seller_id')
            .eq('id', businessId)
            .single();

        if (checkError) throw checkError;

        if (business.seller_id !== sellerId) {
            throw new Error('No tienes permiso para editar este negocio');
        }

        // Use existing updateBusiness function
        return await this.updateBusiness(businessId, businessData);
    }

    /**
     * Process subscription payment and calculate commission
     * @param {string} businessId - Business ID
     * @param {string} planId - Subscription plan ID
     * @param {string} paymentCycle - 'monthly' or 'quarterly'
     * @returns {Promise<Object>} Payment and commission data
     */
    async processSubscriptionPayment(businessId, planId, paymentCycle = 'monthly') {
        // Get business and seller info
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('seller_id, subscription_start_date')
            .eq('id', businessId)
            .single();

        if (businessError) throw businessError;

        // Get plan details
        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError) throw planError;

        // Calculate payment amount
        const monthsCovered = paymentCycle === 'quarterly' ? 3 : 1;
        const originalAmount = plan.price_monthly * monthsCovered;
        const discountPercentage = paymentCycle === 'quarterly' ? 20 : 0;
        const discountAmount = originalAmount * (discountPercentage / 100);
        const finalAmount = originalAmount - discountAmount;

        // Calculate period dates
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + monthsCovered);

        // Insert payment record
        const { data: payment, error: paymentError } = await supabase
            .from('subscription_payments')
            .insert([{
                business_id: businessId,
                subscription_plan_id: planId,
                amount: finalAmount,
                original_amount: originalAmount,
                discount_percentage: discountPercentage,
                payment_cycle: paymentCycle,
                months_covered: monthsCovered,
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
                status: 'completed'
            }])
            .select()
            .single();

        if (paymentError) throw paymentError;

        // Update business subscription status
        const updateData = {
            subscription_status: 'active',
            payment_cycle: paymentCycle
        };

        // Set subscription_start_date if this is the first payment
        if (!business.subscription_start_date) {
            updateData.subscription_start_date = periodStart.toISOString();
        }

        await supabase
            .from('businesses')
            .update(updateData)
            .eq('id', businessId);

        // Calculate and record commission
        const commission = await this.calculateCommission(businessId, payment.id);

        return {
            payment,
            commission
        };
    }

    /**
     * Calculate commission for a payment
     * @param {string} businessId - Business ID
     * @param {string} paymentId - Payment ID
     * @returns {Promise<Object>} Commission data
     */
    async calculateCommission(businessId, paymentId) {
        // Get business and payment info
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('seller_id, subscription_start_date')
            .eq('id', businessId)
            .single();

        if (businessError) throw businessError;

        if (!business.seller_id) {
            console.log('Business has no seller, skipping commission');
            return null;
        }

        const { data: payment, error: paymentError } = await supabase
            .from('subscription_payments')
            .select('amount')
            .eq('id', paymentId)
            .single();

        if (paymentError) throw paymentError;

        // Calculate subscription month
        const startDate = new Date(business.subscription_start_date);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 +
            (now.getMonth() - startDate.getMonth()) + 1;
        const subscriptionMonth = Math.max(1, monthsDiff);

        // Get commission rate based on subscription month
        const getCommissionRate = (month) => {
            if (month === 1) return 40;
            if (month === 2) return 30;
            if (month === 3) return 20;
            if (month >= 4 && month <= 6) return 10;
            return 0; // Month 7+
        };

        const baseRate = getCommissionRate(subscriptionMonth);

        // If no commission for this month, skip
        if (baseRate === 0) {
            console.log(`No commission for month ${subscriptionMonth}`);
            return null;
        }

        // Count active clients for seller this month
        const { count: activeClientsCount } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', business.seller_id)
            .eq('subscription_status', 'active');

        // Calculate volume bonus
        const volumeBonus = (activeClientsCount || 0) >= 50 ? 5 : 0;
        const totalRate = baseRate + volumeBonus;
        const commissionAmount = payment.amount * (totalRate / 100);

        // Insert commission record
        const currentDate = new Date();
        const { data: commission, error: commissionError } = await supabase
            .from('seller_commissions')
            .insert([{
                seller_id: business.seller_id,
                business_id: businessId,
                payment_id: paymentId,
                subscription_month: subscriptionMonth,
                base_commission_rate: baseRate,
                volume_bonus: volumeBonus,
                total_commission_rate: totalRate,
                commission_amount: commissionAmount,
                payment_amount: payment.amount,
                period_month: currentDate.getMonth() + 1,
                period_year: currentDate.getFullYear(),
                active_clients_count: activeClientsCount || 0
            }])
            .select()
            .single();

        if (commissionError) throw commissionError;

        return commission;
    }

    /**
     * Get seller commissions for a period
     * @param {string} sellerId - Seller ID
     * @param {number} month - Month (1-12)
     * @param {number} year - Year
     * @returns {Promise<Object>} Commissions data
     */
    async getSellerCommissions(sellerId, month, year) {
        const { data, error } = await supabase
            .from('seller_commissions')
            .select(`
                *,
                businesses (name),
                subscription_payments (amount, payment_date)
            `)
            .eq('seller_id', sellerId)
            .eq('period_month', month)
            .eq('period_year', year)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const total = (data || []).reduce((sum, comm) => sum + parseFloat(comm.commission_amount), 0);

        return {
            commissions: data || [],
            total,
            month,
            year
        };
    }

    /**
     * Get seller statistics
     * @param {string} sellerId - Seller ID
     * @returns {Promise<Object>} Seller stats
     */
    async getSellerStats(sellerId) {
        // Get all businesses
        const { data: allBusinesses, error: businessError } = await supabase
            .from('businesses')
            .select('subscription_status')
            .eq('seller_id', sellerId);

        if (businessError) throw businessError;

        const totalBusinesses = allBusinesses?.length || 0;
        const trialBusinesses = allBusinesses?.filter(b => b.subscription_status === 'trial').length || 0;
        const activeBusinesses = allBusinesses?.filter(b => b.subscription_status === 'active').length || 0;
        const conversionRate = totalBusinesses > 0 ? (activeBusinesses / totalBusinesses) * 100 : 0;

        // Get current month commissions
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const { total: monthlyCommissions } = await this.getSellerCommissions(
            sellerId,
            currentMonth,
            currentYear
        );

        // Get monthly projection
        const projection = await this.getSellerMonthlyProjection(sellerId);

        return {
            totalBusinesses,
            trialBusinesses,
            activeBusinesses,
            conversionRate: conversionRate.toFixed(2),
            monthlyCommissions,
            projection
        };
    }

    /**
     * Get seller monthly projection
     * @param {string} sellerId - Seller ID
     * @returns {Promise<Object>} Projection data
     */
    async getSellerMonthlyProjection(sellerId) {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        // Get current month commissions
        const { total: currentCommissions } = await this.getSellerCommissions(
            sellerId,
            currentMonth,
            currentYear
        );

        // Calculate projection
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const daysPassed = currentDate.getDate();
        const daysRemaining = daysInMonth - daysPassed;

        const dailyAverage = daysPassed > 0 ? currentCommissions / daysPassed : 0;
        const projectedTotal = dailyAverage * daysInMonth;

        return {
            currentCommissions,
            dailyAverage: dailyAverage.toFixed(2),
            projectedTotal: projectedTotal.toFixed(2),
            daysInMonth,
            daysPassed,
            daysRemaining
        };
    }

    /**
     * Change business password
     * @param {string} businessId - Business ID
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<boolean>} Success status
     */
    async changeBusinessPassword(businessId, oldPassword, newPassword) {
        // Verify old password
        const { data: business, error: checkError } = await supabase
            .from('businesses')
            .select('password')
            .eq('id', businessId)
            .single();

        if (checkError) throw checkError;

        if (business.password !== oldPassword) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Validate new password
        if (newPassword.length < 8) {
            throw new Error('La contraseña debe tener al menos 8 caracteres');
        }

        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            throw new Error('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
        }

        // Update password
        const { error: updateError } = await supabase
            .from('businesses')
            .update({
                password: newPassword,
                password_changed: true
            })
            .eq('id', businessId);

        if (updateError) throw updateError;

        return true;
    }

    // ==================== SUPER ADMIN FUNCTIONS ====================

    /**
     * Super Admin Login
     */
    async loginSuperAdmin(email, password) {
        const { data, error } = await supabase
            .from('super_admins')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            throw new Error('Credenciales inválidas o cuenta inactiva');
        }

        return {
            id: data.id,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            role: 'super_admin'
        };
    }

    /**
     * Get all sellers with their statistics
     */
    async getAllSellers() {
        const { data: sellers, error } = await supabase
            .from('sellers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get statistics for each seller
        const sellersWithStats = await Promise.all(sellers.map(async (seller) => {
            const stats = await this.getSellerStats(seller.id);
            return {
                ...seller,
                stats
            };
        }));

        return sellersWithStats;
    }

    /**
     * Get global system analytics
     */
    async getGlobalAnalytics() {
        // Get all sellers
        const { data: sellers } = await supabase
            .from('sellers')
            .select('id');

        // Get all businesses
        const { data: businesses } = await supabase
            .from('businesses')
            .select('id, seller_id, subscription_status, created_at');

        // Get all commissions for current month
        const now = new Date();
        const { data: commissions } = await supabase
            .from('seller_commissions')
            .select('commission_amount, seller_id')
            .eq('period_month', now.getMonth() + 1)
            .eq('period_year', now.getFullYear());

        // Get all bookings
        const { data: bookings } = await supabase
            .from('bookings')
            .select('id, price, created_at')
            .neq('status', 'cancelled');

        // Calculate metrics
        const totalSellers = sellers?.length || 0;
        const totalBusinesses = businesses?.length || 0;
        const activeBusinesses = businesses?.filter(b => b.subscription_status === 'active').length || 0;
        const trialBusinesses = businesses?.filter(b => b.subscription_status === 'trial').length || 0;

        const totalCommissions = commissions?.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0;
        const totalRevenue = bookings?.reduce((sum, b) => sum + parseFloat(b.price || 0), 0) || 0;
        const totalBookings = bookings?.length || 0;

        // Calculate conversion rate
        const conversionRate = totalBusinesses > 0
            ? ((activeBusinesses / totalBusinesses) * 100).toFixed(2)
            : 0;

        // Top sellers by commissions this month
        const sellerCommissions = {};
        commissions?.forEach(c => {
            if (!sellerCommissions[c.seller_id]) {
                sellerCommissions[c.seller_id] = 0;
            }
            sellerCommissions[c.seller_id] += parseFloat(c.commission_amount || 0);
        });

        const topSellers = Object.entries(sellerCommissions)
            .map(([sellerId, amount]) => ({ sellerId, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        return {
            totalSellers,
            totalBusinesses,
            activeBusinesses,
            trialBusinesses,
            conversionRate,
            totalCommissions,
            totalRevenue,
            totalBookings,
            topSellers
        };
    }

    /**
     * Get all businesses across all sellers
     */
    async getAllBusinesses() {
        const { data, error } = await supabase
            .from('businesses')
            .select(`
                *,
                sellers (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                categories (
                    id,
                    name,
                    icon
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data;
    }

    /**
     * Get commission trends (monthly data for charts)
     */
    async getCommissionTrends(months = 6) {
        const now = new Date();
        const trends = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();

            const { data } = await supabase
                .from('seller_commissions')
                .select('commission_amount')
                .eq('period_month', month)
                .eq('period_year', year);

            const total = data?.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0;

            trends.push({
                month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
                amount: total
            });
        }

        return trends;
    }

    /**
     * Get business growth trends
     */
    async getBusinessGrowthTrends(months = 6) {
        const now = new Date();
        const trends = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const { data } = await supabase
                .from('businesses')
                .select('id')
                .gte('created_at', startOfMonth.toISOString())
                .lte('created_at', endOfMonth.toISOString());

            trends.push({
                month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
                count: data?.length || 0
            });
        }

        return trends;
    }

    /**
     * Manage seller (activate/deactivate)
     */
    async updateSellerStatus(sellerId, isActive) {
        const { error } = await supabase
            .from('sellers')
            .update({ is_active: isActive })
            .eq('id', sellerId);

        if (error) throw error;
        return true;
    }

    /**
     * Get detailed seller report
     */
    async getSellerDetailedReport(sellerId) {
        const [seller, businesses, commissions] = await Promise.all([
            supabase.from('sellers').select('*').eq('id', sellerId).single(),
            this.getSellerBusinesses(sellerId),
            supabase.from('seller_commissions')
                .select('*')
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false })
                .limit(100)
        ]);

        if (seller.error) throw seller.error;

        const totalCommissions = commissions.data?.reduce((sum, c) =>
            sum + parseFloat(c.commission_amount || 0), 0) || 0;

        return {
            seller: seller.data,
            businesses,
            recentCommissions: commissions.data || [],
            totalCommissions,
            totalBusinesses: businesses.length,
            activeBusinesses: businesses.filter(b => b.subscription_status === 'active').length
        };
    }

    // ==================== SUPER ADMIN - CATEGORY MANAGEMENT ====================

    /**
     * Create new category
     */
    async createCategory(categoryData) {
        const { data, error } = await supabase
            .from('categories')
            .insert([{
                name: categoryData.name,
                icon: categoryData.icon,
                description: categoryData.description
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update category
     */
    async updateCategory(categoryId, categoryData) {
        const { data, error } = await supabase
            .from('categories')
            .update({
                name: categoryData.name,
                icon: categoryData.icon,
                description: categoryData.description
            })
            .eq('id', categoryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete category (only if no businesses use it)
     */
    async deleteCategory(categoryId) {
        // Check if any businesses use this category
        const { data: businesses } = await supabase
            .from('businesses')
            .select('id')
            .eq('category_id', categoryId)
            .limit(1);

        if (businesses && businesses.length > 0) {
            throw new Error('No se puede eliminar la categoría porque hay negocios asociados');
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (error) throw error;
        return true;
    }

    /**
     * Create new subcategory
     */
    async createSubcategory(subcategoryData) {
        const { data, error } = await supabase
            .from('subcategories')
            .insert([{
                category_id: subcategoryData.category_id,
                name: subcategoryData.name,
                description: subcategoryData.description
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update subcategory
     */
    async updateSubcategory(subcategoryId, subcategoryData) {
        const { data, error } = await supabase
            .from('subcategories')
            .update({
                name: subcategoryData.name,
                description: subcategoryData.description,
                category_id: subcategoryData.category_id
            })
            .eq('id', subcategoryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete subcategory (only if no businesses use it)
     */
    async deleteSubcategory(subcategoryId) {
        // Check if any businesses use this subcategory
        const { data: businesses } = await supabase
            .from('businesses')
            .select('id')
            .eq('subcategory_id', subcategoryId)
            .limit(1);

        if (businesses && businesses.length > 0) {
            throw new Error('No se puede eliminar la subcategoría porque hay negocios asociados');
        }

        const { error } = await supabase
            .from('subcategories')
            .delete()
            .eq('id', subcategoryId);

        if (error) throw error;
        return true;
    }

    // ==================== SUPER ADMIN - BUSINESS MANAGEMENT ====================

    /**
     * Create business as super admin (no seller restriction)
     */
    async createBusinessAsSuperAdmin(businessData) {
        // Use the existing createBusiness function but without seller_id requirement
        return await this.createBusiness(businessData);
    }

    /**
     * Update any business as super admin
     */
    async updateBusinessAsSuperAdmin(businessId, businessData) {
        const updateData = {
            name: businessData.name,
            category_id: businessData.category_id,
            subcategory_id: businessData.subcategory_id,
            location: businessData.location,
            latitude: businessData.latitude,
            longitude: businessData.longitude,
            phone: businessData.phone,
            whatsapp: businessData.whatsapp,
            instagram: businessData.instagram,
            facebook: businessData.facebook,
            type: businessData.type,
            subscription_plan_id: businessData.subscription_plan_id,
            seller_id: businessData.seller_id
        };

        const { data, error } = await supabase
            .from('businesses')
            .update(updateData)
            .eq('id', businessId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete business as super admin
     */
    async deleteBusinessAsSuperAdmin(businessId) {
        // First delete related data
        await Promise.all([
            supabase.from('bookings').delete().eq('business_id', businessId),
            supabase.from('resources').delete().eq('business_id', businessId),
            supabase.from('seller_commissions').delete().eq('business_id', businessId),
            supabase.from('subscription_payments').delete().eq('business_id', businessId)
        ]);

        // Then delete the business
        const { error } = await supabase
            .from('businesses')
            .delete()
            .eq('id', businessId);

        if (error) throw error;
        return true;
    }

    // ==================== SUPER ADMIN - BOOKINGS ANALYTICS ====================

    /**
     * Get global bookings analytics
     */
    async getBookingsAnalytics() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Get all bookings
        const { data: allBookings } = await supabase
            .from('bookings')
            .select('*, businesses(name, categories(name, icon))')
            .order('created_at', { ascending: false });

        // Get this month's bookings
        const { data: thisMonthBookings } = await supabase
            .from('bookings')
            .select('*')
            .gte('created_at', startOfMonth.toISOString());

        // Get last month's bookings
        const { data: lastMonthBookings } = await supabase
            .from('bookings')
            .select('*')
            .gte('created_at', startOfLastMonth.toISOString())
            .lte('created_at', endOfLastMonth.toISOString());

        // Calculate metrics
        const totalBookings = allBookings?.length || 0;
        const thisMonthCount = thisMonthBookings?.length || 0;
        const lastMonthCount = lastMonthBookings?.length || 0;
        const growthRate = lastMonthCount > 0
            ? (((thisMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1)
            : 0;

        const totalRevenue = allBookings?.reduce((sum, b) => sum + parseFloat(b.price || 0), 0) || 0;
        const thisMonthRevenue = thisMonthBookings?.reduce((sum, b) => sum + parseFloat(b.price || 0), 0) || 0;
        const lastMonthRevenue = lastMonthBookings?.reduce((sum, b) => sum + parseFloat(b.price || 0), 0) || 0;
        const revenueGrowth = lastMonthRevenue > 0
            ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
            : 0;

        const avgBookingValue = totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0;

        // Status breakdown
        const statusBreakdown = {};
        allBookings?.forEach(b => {
            statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1;
        });

        // Top businesses by bookings
        const businessBookings = {};
        allBookings?.forEach(b => {
            if (!businessBookings[b.business_id]) {
                businessBookings[b.business_id] = {
                    count: 0,
                    revenue: 0,
                    name: b.businesses?.name || 'Unknown',
                    category: b.businesses?.categories?.name || 'Unknown'
                };
            }
            businessBookings[b.business_id].count++;
            businessBookings[b.business_id].revenue += parseFloat(b.price || 0);
        });

        const topBusinesses = Object.values(businessBookings)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalBookings,
            thisMonthCount,
            lastMonthCount,
            growthRate,
            totalRevenue,
            thisMonthRevenue,
            lastMonthRevenue,
            revenueGrowth,
            avgBookingValue,
            statusBreakdown,
            topBusinesses,
            recentBookings: allBookings?.slice(0, 20) || []
        };
    }

    /**
     * Get detailed seller information with recent actions
     */
    async getSellerDetails(sellerId) {
        const [seller, businesses, commissions, stats] = await Promise.all([
            supabase.from('sellers').select('*').eq('id', sellerId).single(),
            this.getSellerBusinesses(sellerId),
            supabase.from('seller_commissions')
                .select('*')
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false })
                .limit(10),
            this.getSellerStats(sellerId)
        ]);

        if (seller.error) throw seller.error;

        // Get recent business creations
        const recentBusinesses = businesses
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        // Calculate total lifetime commissions
        const { data: allCommissions } = await supabase
            .from('seller_commissions')
            .select('commission_amount')
            .eq('seller_id', sellerId);

        const lifetimeCommissions = allCommissions?.reduce((sum, c) =>
            sum + parseFloat(c.commission_amount || 0), 0) || 0;

        return {
            seller: seller.data,
            stats,
            businesses,
            recentBusinesses,
            recentCommissions: commissions.data || [],
            lifetimeCommissions,
            totalBusinesses: businesses.length,
            activeBusinesses: businesses.filter(b => b.subscription_status === 'active').length,
            trialBusinesses: businesses.filter(b => b.subscription_status === 'trial').length
        };
    }

    // --- Specialist Availability & Assignment ---

    /**
     * Get all specialists qualified for a specific service
     * @param {string} serviceId - The service ID
     * @param {string} [businessId=null] - The business ID (optional, for fallback)
     * @returns {Promise<Array>} Array of specialists with their details
     */
    async getQualifiedSpecialists(serviceId, businessId = null) {
        const { data, error } = await supabase
            .from('service_specialists')
            .select(`
                specialist_id,
                specialists (
                    id,
                    name,
                    role,
                    avatar_url
                )
            `)
            .eq('service_id', serviceId);

        if (error) {
            console.error('Error fetching qualified specialists:', error);
            return [];
        }

        // Flatten the structure
        let specialists = data.map(item => item.specialists).filter(Boolean);

        // FALLBACK: If no specialists assigned and businessId provided, fetch all business specialists
        // This ensures existing services work without manual assignment
        if (specialists.length === 0 && businessId) {
            console.log(`No specialists assigned to service ${serviceId}, falling back to all business specialists`);
            const { data: allSpecialists, error: fallbackError } = await supabase
                .from('specialists')
                .select('id, name, role, avatar_url')
                .eq('business_id', businessId);

            if (!fallbackError && allSpecialists) {
                specialists = allSpecialists;
            }
        }

        return specialists;
    }

    /**
     * Update specialists for a specific service
     * @param {string} serviceId - The service ID
     * @param {Array<string>} specialistIds - Array of specialist IDs to assign
     * @returns {Promise<boolean>} True if successful
     */
    async updateServiceSpecialists(serviceId, specialistIds) {
        // First delete existing associations
        const { error: deleteError } = await supabase
            .from('service_specialists')
            .delete()
            .eq('service_id', serviceId);

        if (deleteError) {
            console.error('Error deleting service specialists:', deleteError);
            return false;
        }

        if (!specialistIds || specialistIds.length === 0) {
            return true;
        }

        // Insert new associations
        const { error: insertError } = await supabase
            .from('service_specialists')
            .insert(
                specialistIds.map(specialistId => ({
                    service_id: serviceId,
                    specialist_id: specialistId
                }))
            );

        if (insertError) {
            console.error('Error updating service specialists:', insertError);
            return false;
        }

        return true;
    }

    /**
     * Get all bookings for a specialist on a specific date
     * @param {string} specialistId - The specialist ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Array>} Array of bookings
     */
    async getSpecialistBookings(specialistId, date) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('specialist_id', specialistId)
            .eq('date', date)
            .in('status', ['pending', 'confirmed', 'deposit_paid']);

        if (error) {
            console.error('Error fetching specialist bookings:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Check if a specialist is available at a specific time
     * @param {string} specialistId - The specialist ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} time - Time in HH:MM format
     * @param {number} duration - Duration in minutes
     * @returns {Promise<boolean>} True if available, false if busy
     */
    async isSpecialistAvailable(specialistId, date, time, duration) {
        const bookings = await this.getSpecialistBookings(specialistId, date);

        // Convert time to minutes for easier comparison
        const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const requestStart = timeToMinutes(time);
        const requestEnd = requestStart + duration;

        // Check for conflicts
        for (const booking of bookings) {
            const bookingStart = timeToMinutes(booking.time);
            const bookingEnd = bookingStart + (booking.duration || 60);

            // Check if time ranges overlap
            if (
                (requestStart >= bookingStart && requestStart < bookingEnd) ||
                (requestEnd > bookingStart && requestEnd <= bookingEnd) ||
                (requestStart <= bookingStart && requestEnd >= bookingEnd)
            ) {
                return false; // Conflict found
            }
        }

        return true; // No conflicts
    }

    /**
     * Get all available specialists for a service at a specific time
     * Get available qualified specialists effectively (checking bookings)
     * @param {string} serviceId - The service ID
     * @param {string} date - Date YYYY-MM-DD
     * @param {string} time - Time HH:MM
     * @param {number} duration - Duration in minutes
     * @param {string} [businessId=null] - The business ID (optional)
     * @returns {Promise<Array>} Sorted available specialists
     */
    async getAvailableSpecialists(serviceId, date, time, duration, businessId = null) {
        // Get all qualified specialists
        const qualifiedSpecialists = await this.getQualifiedSpecialists(serviceId, businessId);

        if (qualifiedSpecialists.length === 0) {
            return [];
        }

        // Check availability and get booking counts
        const availabilityChecks = await Promise.all(
            qualifiedSpecialists.map(async (specialist) => {
                const isAvailable = await this.isSpecialistAvailable(
                    specialist.id,
                    date,
                    time,
                    duration
                );

                if (!isAvailable) {
                    return null;
                }

                // Get booking count for this day (for load balancing)
                const bookings = await this.getSpecialistBookings(specialist.id, date);

                return {
                    id: specialist.id,
                    name: specialist.name,
                    role: specialist.role,
                    avatar_url: specialist.avatar_url,
                    bookingCount: bookings.length
                };
            })
        );

        // Filter out unavailable specialists and sort by booking count
        const availableSpecialists = availabilityChecks
            .filter(Boolean)
            .sort((a, b) => a.bookingCount - b.bookingCount);

        return availableSpecialists;
    }
}

export default new SupabaseService();

