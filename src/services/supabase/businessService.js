import { supabase } from '../supabaseClient';
import { createDefaultSubscription } from './subscriptionService';
import { syncBusinessResources } from './resourceService';
import { updateServiceSpecialists } from './bookingService';

export function processBusinessData(data) {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(item => processBusinessData(item));
    }

    const business = { ...data };

    if (typeof business.hours === 'string' && business.hours.trim().startsWith('{')) {
        try {
            business.hours = JSON.parse(business.hours);
        } catch (e) { }
    }

    if (business.payment_settings) {
        if (typeof business.payment_settings === 'string') {
            try {
                business.payment_settings = JSON.parse(business.payment_settings);
            } catch (e) {
                business.payment_settings = {};
            }
        }
    } else {
        business.payment_settings = {};
    }

    if (business.time_ranges && typeof business.time_ranges === 'string') {
        try {
            business.time_ranges = JSON.parse(business.time_ranges);
        } catch (e) {
            business.time_ranges = [];
        }
    }

    if (business.operating_hours && typeof business.operating_hours === 'string') {
        try {
            business.operating_hours = JSON.parse(business.operating_hours);
        } catch (e) {
            business.operating_hours = {};
        }
    }

    if (business.metadata) {
        if (typeof business.metadata === 'string') {
            try {
                business.metadata = JSON.parse(business.metadata);
            } catch (e) {
                business.metadata = {};
            }
        }
    } else {
        business.metadata = {};
    }

    const directBlocked = Array.isArray(business.blocked_dates) ? business.blocked_dates : [];
    const metaBlocked = Array.isArray(business.metadata?.blocked_dates) ? business.metadata.blocked_dates : [];
    business.blocked_dates = directBlocked.length > 0 ? directBlocked : metaBlocked;

    const directTiers = Array.isArray(business.pricing_tiers) ? business.pricing_tiers : [];
    const metaTiers = Array.isArray(business.metadata?.pricing_tiers) ? business.metadata.pricing_tiers : [];
    business.pricing_tiers = directTiers.length > 0 ? directTiers : metaTiers;

    const parseDiscounts = (val) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
            } catch (e) { }
        }
        return null;
    };
    business.duration_discounts = parseDiscounts(business.duration_discounts) || parseDiscounts(business.metadata?.duration_discounts) || {};

    const directCoupons = Array.isArray(business.coupons) ? business.coupons : [];
    const metaCoupons = Array.isArray(business.metadata?.coupons) ? business.metadata.coupons : [];
    business.coupons = directCoupons.length > 0 ? directCoupons : metaCoupons;

    if (!business.whatsapp_templates && business.metadata?.whatsapp_templates) {
        business.whatsapp_templates = business.metadata.whatsapp_templates;
    }

    if (!business.website && business.metadata?.website) {
        business.website = business.metadata.website;
    }
    if (business.tiktok === undefined || business.tiktok === null) {
        business.tiktok = business.metadata?.tiktok || '';
    }

    if (!business.special_days && business.hours) {
        try {
            const hoursObj = typeof business.hours === 'string' ? JSON.parse(business.hours) : business.hours;
            if (hoursObj && hoursObj.special_days) {
                business.special_days = hoursObj.special_days;
            }
        } catch (e) { }
    }

    if (business.logo_url && !business.logo) {
        business.logo = business.logo_url;
    }
    if (business.logo && !business.logo_url) {
        business.logo_url = business.logo;
    }
    if (business.banner_url && !business.banner_image) {
        business.banner_image = business.banner_url;
    }
    if (business.banner_image && !business.banner_url) {
        business.banner_url = business.banner_image;
    }
    if (Array.isArray(business.courts) && business.courts.length > 0) {
        business.courts = [...business.courts].sort((a, b) => 
            (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
        );
    }

    if (Array.isArray(business.resources) && business.resources.length > 0) {
        business.resources = [...business.resources].sort((a, b) => 
            (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
        );
    }

    return business;
}

export async function getBusinesses() {
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
            services (
                *,
                service_specialists (
                    specialist_id,
                    specialists (*)
                )
            ),
            courts (*),
            specialists (*)
        `);

    if (error) throw error;

    let allSpecialists = [];
    try {
        const { data: specData } = await supabase
            .from('specialists')
            .select('*')
            .order('created_at', { ascending: true });
        if (specData) allSpecialists = specData;
    } catch (e) {
        console.warn('Specialists fetch notice:', e);
    }

    const businesses = (data || []).map(b => {
        const subcategories = b.business_subcategories?.map(bs => bs.subcategories) || [];
        const bSpecialists = (b.specialists && b.specialists.length > 0)
            ? b.specialists
            : allSpecialists.filter(s => s.business_id === b.id);

        let bServices = b.services || [];
        if (Array.isArray(bServices)) {
            bServices = bServices.map(service => {
                const assignedSpecialists = (service.service_specialists || [])
                    .map(ss => ss.specialists || (bSpecialists ? bSpecialists.find(s => s.id === ss.specialist_id) : null))
                    .filter(Boolean);

                const assignedSpecialistIds = (service.service_specialists || [])
                    .map(ss => ss.specialist_id || ss.specialists?.id)
                    .filter(Boolean);

                const finalSpecialists = assignedSpecialists.length > 0
                    ? assignedSpecialists
                    : (bSpecialists || []);

                return {
                    ...service,
                    specialist_id: assignedSpecialistIds[0] || (bSpecialists?.[0]?.id || ''),
                    specialist: assignedSpecialists[0] || (bSpecialists?.[0] || null),
                    specialists: finalSpecialists,
                    specialist_ids: assignedSpecialistIds.length > 0 ? assignedSpecialistIds : (bSpecialists ? bSpecialists.map(s => s.id) : [])
                };
            });
        }

        return {
            ...b,
            subcategories,
            specialists: bSpecialists,
            services: bServices
        };
    });

    return processBusinessData(businesses);
}

export async function getNearbyBusinesses(lat, lng, radius = 5000) {
    const { data, error } = await supabase
        .rpc('get_nearby_businesses', {
            user_lat: lat,
            user_lng: lng,
            radius_meters: radius
        });

    if (error) throw error;
    return processBusinessData(data);
}

export async function getBusinessById(id) {
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

    const { data: specialists } = await supabase
        .from('specialists')
        .select('*')
        .eq('business_id', id);

    if (data.services && Array.isArray(data.services)) {
        data.services = data.services.map(service => {
            const assignedSpecialists = (service.service_specialists || [])
                .map(ss => ss.specialists || (specialists ? specialists.find(s => s.id === ss.specialist_id) : null))
                .filter(Boolean);

            const assignedSpecialistIds = (service.service_specialists || [])
                .map(ss => ss.specialist_id || ss.specialists?.id)
                .filter(Boolean);

            const finalSpecialists = assignedSpecialists.length > 0
                ? assignedSpecialists
                : (specialists || []);

            return {
                ...service,
                specialist_id: assignedSpecialistIds[0] || (specialists?.[0]?.id || ''),
                specialist: assignedSpecialists[0] || (specialists?.[0] || null),
                specialists: finalSpecialists,
                specialist_ids: assignedSpecialistIds.length > 0 ? assignedSpecialistIds : (specialists ? specialists.map(s => s.id) : [])
            };
        });
    }

    data.specialists = specialists || [];

    try {
        const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('business_id', id)
            .maybeSingle();
        if (subData) {
            data.subscription = subData;
            data.subscriptions = [subData];
        }
    } catch (subErr) {
        console.warn('Subscriptions fetch notice:', subErr);
    }

    return processBusinessData(data);
}

export async function getSpecialists(businessId) {
    if (!businessId) return [];
    try {
        const { data, error } = await supabase
            .from('specialists')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.warn('Error fetching specialists:', e);
        return [];
    }
}

export async function getBusinessBySlug(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();
    const cleanNoHyphens = cleanSlug.replace(/[-_]/g, '');

    let query = supabase
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
            services (
                *,
                service_specialists (
                    specialist_id,
                    specialists (*)
                )
            ),
            courts (*),
            specialists (*)
        `);

    if (cleanSlug === cleanNoHyphens) {
        query = query.eq('slug', cleanSlug);
    } else {
        query = query.or(`slug.eq.${cleanSlug},slug.eq.${cleanNoHyphens}`);
    }

    const { data: results, error } = await query.limit(1);

    if (error) throw error;
    const data = results?.[0] || null;
    if (!data) {
        throw new Error(`Business not found for slug: ${slug}`);
    }

    const { data: specialists } = await supabase
        .from('specialists')
        .select('*')
        .eq('business_id', data.id);

    if (data.services && Array.isArray(data.services)) {
        data.services = data.services.map(service => {
            const assignedSpecialists = (service.service_specialists || [])
                .map(ss => ss.specialists || (specialists ? specialists.find(s => s.id === ss.specialist_id) : null))
                .filter(Boolean);

            const assignedSpecialistIds = (service.service_specialists || [])
                .map(ss => ss.specialist_id || ss.specialists?.id)
                .filter(Boolean);

            const finalSpecialists = assignedSpecialists.length > 0
                ? assignedSpecialists
                : (specialists || []);

            return {
                ...service,
                specialist_id: assignedSpecialistIds[0] || (specialists?.[0]?.id || ''),
                specialist: assignedSpecialists[0] || (specialists?.[0] || null),
                specialists: finalSpecialists,
                specialist_ids: assignedSpecialistIds.length > 0 ? assignedSpecialistIds : (specialists ? specialists.map(s => s.id) : [])
            };
        });
    }

    data.specialists = specialists || [];

    const subcategories = data.business_subcategories?.map(bs => bs.subcategories) || [];
    data.subcategories = subcategories;

    return processBusinessData(data);
}

export async function login(email, password) {
    let authUser = null;
    try {
        const { data: authData } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (authData?.user) {
            authUser = authData.user;
        }
    } catch (e) {
        console.warn('Supabase Auth signIn failed:', e);
    }

    let business = null;
    if (authUser) {
        const { data } = await supabase
            .from('businesses')
            .select('id')
            .or(`auth_id.eq.${authUser.id},email.eq.${email}`)
            .maybeSingle();

        if (data?.id) {
            business = await getBusinessById(data.id);
        }
    }

    if (!business) {
        const { data } = await supabase
            .from('businesses')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (data?.id) {
            business = await getBusinessById(data.id);
        }

        if (business && !authUser) {
            try {
                const { data: signUpData } = await supabase.auth.signUp({
                    email,
                    password
                });
                if (signUpData?.user) {
                    authUser = signUpData.user;
                    await supabase.from('businesses').update({ auth_id: authUser.id }).eq('id', business.id);
                }
            } catch (e) {
                console.warn('Auto sign up fallback failed:', e);
            }
        }
    }

    if (!business) {
        throw new Error('Credenciales inválidas');
    }

    return {
        ...business,
        requirePasswordChange: !business.password_changed,
        subscriptionStatus: business.subscription_status,
        trialEndDate: business.trial_end_date
    };
}

export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out of Supabase:', error);
}

export async function createBusiness(businessData) {
    if (businessData.subcategory_id && (!businessData.subcategories || businessData.subcategories.length === 0)) {
        businessData.subcategories = [businessData.subcategory_id];
    }

    let planId = businessData.subscription_plan_id;
    if (!planId || planId === '1' || planId === 1) {
        try {
            const { data: plans } = await supabase
                .from('subscription_plans')
                .select('id')
                .limit(1);
            if (plans && plans.length > 0) {
                planId = plans[0].id;
                businessData.subscription_plan_id = planId;
            }
        } catch (e) {
            console.warn('Could not fetch default plan:', e);
        }
    }

    let sellerId = businessData.seller_id;
    if (!sellerId || sellerId === '1' || sellerId === 1) {
        sellerId = null;
        businessData.seller_id = null;
    }

    const categoryId = businessData.category_id && businessData.category_id !== '1'
        ? businessData.category_id
        : null;

    let finalSlug = businessData.slug;
    if (!finalSlug && businessData.name) {
        const baseSlug = businessData.name
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        
        try {
            const { data: existing } = await supabase
                .from('businesses')
                .select('id')
                .eq('slug', baseSlug)
                .limit(1);
            
            if (existing && existing.length > 0) {
                const randomSuffix = Math.random().toString(36).substring(2, 6);
                finalSlug = `${baseSlug}-${randomSuffix}`;
            } else {
                finalSlug = baseSlug;
            }
        } catch (e) {
            finalSlug = baseSlug;
        }
    }
    finalSlug = finalSlug || `business-${Date.now()}`;

    const businessRecord = {
        name: businessData.name,
        slug: finalSlug,
        category_id: categoryId,
        subscription_plan_id: planId,
        type: businessData.type,
        email: businessData.email,
        seller_id: sellerId,
        logo_url: businessData.logo_url || businessData.logo || businessData.image,
        banner_url: businessData.banner_url || businessData.banner_image,
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
        whatsapp: businessData.whatsapp || businessData.phone || null,
        tiktok: businessData.tiktok || null,
        primary_color: businessData.primaryColor || businessData.button_color || '#3b82f6',
        price_per_hour: businessData.price_per_hour,
        pricing_model: businessData.pricing_model || 'hourly',
        price_per_day: businessData.price_per_day,
        rental_duration_options: businessData.rental_duration_options || [],
        additional_services: businessData.additional_services || [],
        included_amenities: businessData.included_amenities || [],
        gallery_images: businessData.gallery_images || [],
        max_capacity: businessData.max_capacity || 1
    };

    if (!businessData.id && businessData.email && businessData.password) {
        try {
            const { data: authData } = await supabase.auth.signUp({
                email: businessData.email,
                password: businessData.password
            });
            if (authData?.user?.id) {
                businessRecord.auth_id = authData.user.id;
            }
        } catch (e) {
            console.warn('Could not auto-register user in Supabase Auth:', e);
        }
    }

    if (businessData.id) {
        businessRecord.id = businessData.id;
    }

    const { data: business, error: businessError } = businessData.id
        ? await supabase.from('businesses').upsert([businessRecord]).select().single()
        : await supabase.from('businesses').insert([businessRecord]).select().single();

    if (businessError) throw businessError;

    await createDefaultSubscription(business.id, businessData.subscription_plan_id);

    if (businessData.subcategories && businessData.subcategories.length > 0) {
        await supabase.from('business_subcategories').delete().eq('business_id', business.id);

        const subcategoriesToInsert = businessData.subcategories.map(subId => ({
            business_id: business.id,
            subcategory_id: subId
        }));

        const { error: subcategoriesError } = await supabase
            .from('business_subcategories')
            .insert(subcategoriesToInsert);

        if (subcategoriesError) {
            throw new Error(`Error guardando subcategorías: ${subcategoriesError.message}`);
        }
    }

    if (businessData.services && businessData.services.length > 0) {
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

        if (!servicesError && insertedServices) {
            const serviceSpecialistAssociations = [];

            businessData.services.forEach((originalService, index) => {
                if (originalService.specialist_id && insertedServices[index]) {
                    serviceSpecialistAssociations.push({
                        service_id: insertedServices[index].id,
                        specialist_id: originalService.specialist_id
                    });
                }
            });

            if (serviceSpecialistAssociations.length > 0) {
                await supabase
                    .from('service_specialists')
                    .insert(serviceSpecialistAssociations);
            }
        }
    }

    let planSpaces = 2;
    if (planId) {
        try {
            const { data: planData } = await supabase
                .from('subscription_plans')
                .select('spaces_included')
                .eq('id', planId)
                .single();
            if (planData?.spaces_included) planSpaces = planData.spaces_included;
        } catch (e) { }
    }

    const requestedCount = parseInt(businessData.resources_count !== undefined && businessData.resources_count !== null ? businessData.resources_count : (businessData.initial_resources_count || (businessData.capacity ? businessData.capacity : 1))) || 1;

    const isRental = businessData.type === 'venue' || businessData.type === 'alquiler';
    if (isRental) {
        businessData.courts = [];
        businessData.specialists = [];
    } else {
        if (requestedCount > 0 && (!businessData.courts || businessData.courts.length === 0) && (!businessData.specialists || businessData.specialists.length === 0)) {
            const isService = businessData.type === 'service';
            if (isService) {
                businessData.specialists = Array.from({ length: requestedCount }, (_, i) => ({
                    name: `Especialista ${i + 1}`,
                    role: 'General'
                }));
            } else {
                const nameLower = (businessData.name || '').toLowerCase();
                const subcatLower = (businessData.subcategory_slug || businessData.subcategory || '').toLowerCase();
                const catLower = (businessData.category || '').toLowerCase();
                let defaultSport = 'padel';
                if (nameLower.includes('padel') || subcatLower.includes('padel') || catLower.includes('padel')) {
                    defaultSport = 'padel';
                } else if (nameLower.includes('futbol') || subcatLower.includes('futbol') || catLower.includes('futbol')) {
                    defaultSport = 'futbol';
                }

                businessData.courts = Array.from({ length: requestedCount }, (_, i) => ({
                    id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                        ? crypto.randomUUID()
                        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                            const r = Math.random() * 16 | 0;
                            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                        }),
                    name: `Cancha ${i + 1}`,
                    sport: defaultSport,
                    price: businessData.price_per_hour || 10000
                }));
            }
        }
    }

    if (businessData.courts && businessData.courts.length > 0) {
        await supabase.from('courts').delete().eq('business_id', business.id);

        const courtsToInsert = businessData.courts.map(c => {
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
                business_id: business.id,
                name: c.name,
                sport: c.sport,
                price: c.price
            };
        });

        try {
            await supabase.from('courts').insert(courtsToInsert);
            try {
                await supabase.from('resources').insert(courtsToInsert.map(c => ({
                    id: c.id,
                    business_id: c.business_id,
                    name: c.name,
                    type: 'court',
                    sport: c.sport,
                    base_price: c.price,
                    active: true
                })));
            } catch (e2) {
                console.warn('Resources insert notice:', e2.message);
            }
        } catch (errCourts) {
            console.warn('Courts creation exception:', errCourts.message);
        }
    }

    if (businessData.specialists && businessData.specialists.length > 0) {
        try {
            await supabase.from('specialists').delete().eq('business_id', business.id);

            const specialistsToInsert = businessData.specialists.map(sp => ({
                business_id: business.id,
                name: sp.name,
                role: sp.role,
                avatar_url: sp.avatar_url
            }));

            await supabase.from('specialists').insert(specialistsToInsert);

            try {
                await supabase.from('resources').insert(specialistsToInsert.map(sp => ({
                    business_id: sp.business_id,
                    name: sp.name,
                    type: 'service',
                    active: true
                })));
            } catch (e2) {
                console.warn('Resources insert notice:', e2.message);
            }
        } catch (errSpec) {
            console.warn('Specialists creation exception:', errSpec.message);
        }
    }

    const countToSync = businessData.resources_count !== undefined && businessData.resources_count !== null
        ? Number(businessData.resources_count)
        : (businessData.capacity ? Number(businessData.capacity) : requestedCount);
    await syncBusinessResources(business.id, businessData.type || 'sport', countToSync);

    return business;
}

export async function updateBusiness(businessId, businessData) {
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .update({
            name: businessData.name,
            category: businessData.category,
            image: businessData.image || businessData.logo || businessData.logo_url,
            logo: businessData.logo || businessData.logo_url,
            logo_url: businessData.logo_url || businessData.logo,
            banner_image: businessData.banner_image || businessData.banner_url,
            banner_url: businessData.banner_url || businessData.banner_image,
            location: businessData.location,
            latitude: businessData.latitude,
            longitude: businessData.longitude,
            rating: businessData.rating || 0,
            theme: businessData.theme || 'light',
            amenities: businessData.amenities || [],
            hours: businessData.hours,
            sport_types: businessData.sportTypes || [],
            button_color: businessData.brand_color || businessData.primary_color || businessData.button_color || businessData.buttonColor || '#00E676',
            instagram: businessData.instagram,
            facebook: businessData.facebook,
            whatsapp: businessData.whatsapp || businessData.phone || null,
            tiktok: businessData.tiktok || null,
            primary_color: businessData.brand_color || businessData.primary_color || businessData.button_color || businessData.primaryColor || '#00E676',
            service_categories: businessData.service_categories || [],
            time_ranges: businessData.time_ranges || [],
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

    let servicesToUpdate = [];
    let servicesToInsert = [];
    const serviceSpecialistMap = new Map();
    const newServiceSpecialists = [];

    if (businessData.services) {
        const { data: currentServices } = await supabase
            .from('services')
            .select('id')
            .eq('business_id', businessId);

        const currentIds = currentServices ? currentServices.map(s => s.id) : [];
        const incomingIds = businessData.services
            .filter(s => s.id && s.id.length === 36)
            .map(s => s.id);

        if (currentIds.length > 0 && incomingIds.length > 0) {
            const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

            if (idsToDelete.length > 0) {
                await supabase.from('service_specialists').delete().in('service_id', idsToDelete);
                await supabase.from('services').delete().in('id', idsToDelete);
            }
        }

        businessData.services.forEach((s, index) => {
            const isNew = !s.id || s.id.length !== 36;
            const specIds = Array.isArray(s.specialist_ids)
                ? s.specialist_ids
                : (s.specialist_id ? [s.specialist_id] : []);

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
                servicesToInsert.push(serviceData);
                newServiceSpecialists.push(specIds);
            } else {
                serviceData.id = s.id;
                servicesToUpdate.push(serviceData);
                serviceSpecialistMap.set(s.id, specIds);
            }
        });

        if (servicesToUpdate.length > 0) {
            await supabase.from('services').upsert(servicesToUpdate);
        }

        if (servicesToInsert.length > 0) {
            const { data: insertedServices } = await supabase
                .from('services')
                .insert(servicesToInsert)
                .select();

            if (insertedServices) {
                insertedServices.forEach((insertedService, index) => {
                    const specIds = newServiceSpecialists[index];
                    if (specIds && specIds.length > 0) {
                        serviceSpecialistMap.set(insertedService.id, specIds);
                    }
                });
            }
        }
    }

    if (businessData.courts) {
        const { data: currentCourts } = await supabase
            .from('courts')
            .select('id')
            .eq('business_id', businessId);

        const currentIds = currentCourts ? currentCourts.map(c => c.id) : [];
        const incomingIds = businessData.courts
            .map(c => c.id)
            .filter(id => id);

        const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

        if (idsToDelete.length > 0) {
            await supabase.from('courts').delete().in('id', idsToDelete);
        }

        if (businessData.courts.length > 0) {
            const courtsToUpsert = businessData.courts.map(c => {
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

            await supabase.from('courts').upsert(courtsToUpsert, { onConflict: 'id' });
        }
    }

    if (businessData.specialists) {
        const { data: currentSpecialists } = await supabase
            .from('specialists')
            .select('id')
            .eq('business_id', businessId);

        const currentIds = currentSpecialists ? currentSpecialists.map(sp => sp.id) : [];
        const incomingIds = businessData.specialists
            .filter(sp => sp.id && sp.id.length === 36)
            .map(sp => sp.id);

        const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

        if (idsToDelete.length > 0) {
            await supabase.from('service_specialists').delete().in('specialist_id', idsToDelete);
            await supabase.from('specialists').delete().in('id', idsToDelete);
        }

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

        if (specialistsToUpdate.length > 0) {
            await supabase.from('specialists').upsert(specialistsToUpdate);
        }

        if (specialistsToInsert.length > 0) {
            await supabase.from('specialists').insert(specialistsToInsert);
        }

        if (businessData.services) {
            const { data: allServices } = await supabase
                .from('services')
                .select('id')
                .eq('business_id', businessId);

            const serviceIds = allServices?.map(s => s.id) || [];

            if (serviceIds.length > 0) {
                await supabase.from('service_specialists').delete().in('service_id', serviceIds);

                const serviceSpecialistAssociations = [];

                serviceSpecialistMap.forEach((specIds, serviceId) => {
                    const ids = Array.isArray(specIds) ? specIds : (specIds ? [specIds] : []);
                    ids.forEach(specialistId => {
                        if (specialistId) {
                            serviceSpecialistAssociations.push({
                                service_id: serviceId,
                                specialist_id: specialistId
                            });
                        }
                    });
                });

                if (serviceSpecialistAssociations.length > 0) {
                    await supabase.from('service_specialists').insert(serviceSpecialistAssociations);
                }
            }
        }
    }

    return business;
}

export async function patchBusiness(businessId, updates) {
    const VALID_COLUMNS = new Set([
        'name', 'slug', 'category_id', 'subscription_plan_id', 'type',
        'email', 'seller_id', 'logo_url', 'banner_url',
        'location', 'latitude', 'longitude', 'rating', 'theme', 'amenities',
        'hours', 'button_color', 'instagram', 'facebook', 'whatsapp', 'phone',
        'tiktok', 'gallery_highlights', 'bank_name', 'account_holder', 'cbu', 'bank_alias',
        'primary_color', 'price_per_hour', 'price_per_day', 'pricing_model',
        'rental_duration_options', 'additional_services', 'included_amenities',
        'gallery_images', 'max_capacity', 'capacity', 'capacity_limit', 'sport_types',
        'service_categories', 'time_ranges', 'payment_settings', 'auth_id', 'metadata',
        'store_enabled', 'address', 'city', 'description', 'password_changed',
        'subscription_status', 'trial_end_date'
    ]);

    const dbUpdates = {};
    let metadataUpdates = {};

    if (updates.metadata && typeof updates.metadata === 'object') {
        metadataUpdates = { ...updates.metadata };
    }
    if (updates.website !== undefined) {
        metadataUpdates.website = updates.website;
    }
    if (updates.blocked_dates !== undefined) {
        metadataUpdates.blocked_dates = updates.blocked_dates;
    }
    if (updates.pricing_tiers !== undefined) {
        metadataUpdates.pricing_tiers = updates.pricing_tiers;
    }
    if (updates.duration_discounts !== undefined) {
        metadataUpdates.duration_discounts = updates.duration_discounts;
    }
    if (updates.whatsapp_templates !== undefined) {
        metadataUpdates.whatsapp_templates = updates.whatsapp_templates;
    }

    try {
        const { data: currentBiz } = await supabase
            .from('businesses')
            .select('metadata')
            .eq('id', businessId)
            .single();
        if (currentBiz?.metadata && typeof currentBiz.metadata === 'object') {
            metadataUpdates = { ...currentBiz.metadata, ...metadataUpdates };
        }
    } catch (e) {
        console.warn('Could not fetch existing metadata for patch:', e);
    }

    Object.keys(updates).forEach(key => {
        let colName = key;
        if (key === 'buttonColor') colName = 'button_color';
        if (key === 'primaryColor') colName = 'primary_color';
        if (key === 'rentalDurationOptions') colName = 'rental_duration_options';
        if (key === 'additionalServices') colName = 'additional_services';
        if (key === 'maxCapacity') colName = 'max_capacity';
        if (key === 'logo' || key === 'image' || key === 'logo_url') {
            colName = 'logo_url';
        }
        if (key === 'banner_image' || key === 'banner_url') {
            colName = 'banner_url';
        }

        if (VALID_COLUMNS.has(colName)) {
            dbUpdates[colName] = updates[key];
        }
    });

    const colorVal = updates.primary_color || updates.button_color || updates.primaryColor || updates.buttonColor;
    if (colorVal) {
        dbUpdates.primary_color = colorVal;
        dbUpdates.button_color = colorVal;
    }

    if (Object.keys(metadataUpdates).length > 0 || updates.metadata !== undefined) {
        dbUpdates.metadata = metadataUpdates;
    }

    if (updates.special_days || updates.hours) {
        let currentHoursObj = {};
        try {
            const { data: currentBiz } = await supabase
                .from('businesses')
                .select('hours')
                .eq('id', businessId)
                .single();

            if (currentBiz?.hours) {
                currentHoursObj = typeof currentBiz.hours === 'string'
                    ? JSON.parse(currentBiz.hours)
                    : { ...currentBiz.hours };
            }
        } catch (e) {
            console.warn('Could not fetch existing hours for patch:', e);
        }

        let mergedHours = { ...currentHoursObj };

        if (updates.hours) {
            const incomingHours = typeof updates.hours === 'string'
                ? JSON.parse(updates.hours)
                : updates.hours;
            const existingSpecialDays = mergedHours.special_days;
            mergedHours = { ...mergedHours, ...incomingHours };
            if (existingSpecialDays && !incomingHours.special_days) {
                mergedHours.special_days = existingSpecialDays;
            }
        }

        if (updates.special_days) {
            mergedHours.special_days = updates.special_days;
        }

        dbUpdates.hours = JSON.stringify(mergedHours);
    }

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
            .from('businesses')
            .update(dbUpdates)
            .eq('id', businessId);

        if (error) {
            console.error('Supabase patchBusiness error:', error);
            throw error;
        }
    }

    if (updates.courts) {
        let defaultSport = 'padel';
        try {
            const { data: bData } = await supabase.from('businesses').select('sport_types, category, type').eq('id', businessId).single();
            if (bData?.sport_types?.[0]) defaultSport = bData.sport_types[0];
            else if (bData?.category && bData.category.toLowerCase().includes('futbol')) defaultSport = 'futbol';
        } catch (e) { }

        const { data: currentCourts } = await supabase
            .from('courts')
            .select('id')
            .eq('business_id', businessId);

        const currentIds = currentCourts ? currentCourts.map(c => c.id) : [];
        const incomingIds = updates.courts
            .map(c => c.id)
            .filter(id => id && String(id).length === 36 && !String(id).startsWith('temp-'));

        const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));
        if (idsToDelete.length > 0) {
            try {
                await supabase.from('courts').delete().in('id', idsToDelete);
                await supabase.from('resources').delete().in('id', idsToDelete);
            } catch (e) {
                console.warn('Error deleting removed courts:', e);
            }
        }

        if (updates.courts.length > 0) {
            const courtsToUpsert = updates.courts.map((c, idx) => {
                const isValidUUID = c.id && String(c.id).length === 36 && !String(c.id).startsWith('temp-');
                let courtId = isValidUUID ? c.id : null;

                if (!courtId) {
                    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                        courtId = crypto.randomUUID();
                    } else {
                        courtId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
                            var r = Math.random() * 16 | 0, v = char == 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    }
                }

                const priceNum = c.price !== undefined && c.price !== null && !isNaN(Number(c.price)) ? Number(c.price) : 0;

                return {
                    id: courtId,
                    business_id: businessId,
                    name: c.name || `Cancha ${idx + 1}`,
                    sport: c.sport || defaultSport,
                    price: priceNum
                };
            });

            const { error: upsertErr } = await supabase.from('courts').upsert(courtsToUpsert, { onConflict: 'id' });
            if (upsertErr) {
                console.error('Error upserting courts:', upsertErr);
                throw upsertErr;
            }

            const firstPrice = courtsToUpsert.find(c => c.price > 0)?.price;
            if (firstPrice !== undefined) {
                try {
                    await supabase.from('businesses').update({ price_per_hour: firstPrice }).eq('id', businessId);
                } catch (pErr) {
                    console.warn('Could not update price_per_hour on businesses:', pErr);
                }
            }

            try {
                const resourcesToUpsert = courtsToUpsert.map((c, idx) => ({
                    id: c.id,
                    business_id: businessId,
                    name: c.name,
                    type: 'court',
                    sport: c.sport || defaultSport,
                    base_price: c.price,
                    consumes_space: true,
                    active: updates.courts[idx]?.active !== false
                }));
                await supabase.from('resources').upsert(resourcesToUpsert, { onConflict: 'id' });
            } catch (resErr) {
                console.warn('Error syncing courts to resources:', resErr);
            }
        }
    }

    if (updates.services) {
        updates.services = updates.services.map(s => {
            const isValidUUID = s.id && typeof s.id === 'string' && s.id.length === 36;
            const serviceId = isValidUUID
                ? s.id
                : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                    ? crypto.randomUUID()
                    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                        const r = Math.random() * 16 | 0;
                        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    });
            return { ...s, id: serviceId };
        });

        const { data: currentServices } = await supabase
            .from('services')
            .select('id')
            .eq('business_id', businessId);

        const currentIds = currentServices ? currentServices.map(s => s.id) : [];
        const incomingIds = updates.services.map(s => s.id);

        if (currentIds.length > 0) {
            const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));
            if (idsToDelete.length > 0) {
                await supabase.from('service_specialists').delete().in('service_id', idsToDelete);
                await supabase.from('services').delete().in('id', idsToDelete);
            }
        }

        if (updates.services.length > 0) {
            const servicesToUpsert = updates.services.map(s => ({
                id: s.id,
                business_id: businessId,
                name: s.name,
                price: Number(s.price) || 0,
                duration: Number(s.duration) || 60,
                description: s.description || '',
                category: s.category || '',
                image_url: s.image_url || s.image || null
            }));

            await supabase.from('services').upsert(servicesToUpsert);

            for (const s of updates.services) {
                const specIds = Array.isArray(s.specialist_ids)
                    ? s.specialist_ids
                    : (s.specialist_id ? [s.specialist_id] : null);

                if (s.id && specIds !== null) {
                    await updateServiceSpecialists(s.id, specIds);
                }
            }
        }
    }

    if (updates.service_categories !== undefined) {
        await supabase
            .from('businesses')
            .update({ service_categories: updates.service_categories })
            .eq('id', businessId);
    }

    if (updates.specialists) {
        const specialistsPayload = updates.specialists.map(sp => ({
            id: sp.id || '',
            name: sp.name || '',
            role: sp.role || 'General',
            avatar_url: sp.avatar_url || null
        }));

        const { error: rpcError } = await supabase.rpc('upsert_specialists', {
            p_business_id: businessId,
            p_specialists: specialistsPayload
        });

        if (rpcError) {
            console.warn('upsert_specialists RPC error:', rpcError.message);
        }
    }

    return null;
}
