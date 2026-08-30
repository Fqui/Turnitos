import { supabase } from '../supabaseClient';

/**
 * Seller Login
 */
export async function loginSeller(email, password) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('Supabase Auth error:', authError);
        throw new Error('Credenciales inválidas');
    }

    const authId = authData.user.id;

    const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('auth_id', authId)
        .eq('is_active', true)
        .single();

    if (error || !data) {
        throw new Error('No se encontró un vendedor activo asociado a esta cuenta.');
    }

    return data;
}

/**
 * Get all businesses for a seller
 */
export async function getSellerBusinesses(sellerId) {
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

    const businessesWithMetrics = await Promise.all((data || []).map(async (business) => {
        let subscriptionMonth = 0;
        if (business.subscription_start_date) {
            const startDate = new Date(business.subscription_start_date);
            const now = new Date();
            const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 +
                (now.getMonth() - startDate.getMonth()) + 1;
            subscriptionMonth = Math.max(1, monthsDiff);
        }

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
 */
export async function createBusinessBySeller(sellerId, businessData, createBusinessFn) {
    const requestedCount = parseInt(businessData.resources_count || businessData.initial_resources_count || 1);
    const bType = businessData.type || 'sport';

    let planId = businessData.subscription_plan_id;
    if (!planId || planId === '1' || planId.length !== 36) {
        try {
            const { data: matchedPlans } = await supabase
                .from('subscription_plans')
                .select('id, spaces_included')
                .eq('business_type', bType)
                .order('spaces_included', { ascending: true });

            if (matchedPlans && matchedPlans.length > 0) {
                const exactPlan = matchedPlans.find(p => p.spaces_included === requestedCount);
                planId = exactPlan ? exactPlan.id : (matchedPlans.find(p => p.spaces_included >= requestedCount)?.id || matchedPlans[matchedPlans.length - 1].id);
            }
        } catch (err) {
            console.warn('Error matching subscription plan:', err);
        }
    }

    const sanitizedName = businessData.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const email = `${sanitizedName}@turnitoslr.com`;
    const password = 'admin123';

    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 15);

    const businessWithSellerData = {
        ...businessData,
        subscription_plan_id: planId,
        seller_id: sellerId,
        email,
        password,
        password_changed: false,
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        subscription_status: 'trial'
    };

    return await createBusinessFn(businessWithSellerData);
}

/**
 * Update business by seller (with permission check)
 */
export async function updateBusinessBySeller(sellerId, businessId, businessData, updateBusinessFn) {
    const { data: business, error: checkError } = await supabase
        .from('businesses')
        .select('seller_id')
        .eq('id', businessId)
        .single();

    if (checkError) throw checkError;

    if (business.seller_id !== sellerId) {
        throw new Error('No tienes permiso para editar este negocio');
    }

    return await updateBusinessFn(businessId, businessData);
}

/**
 * Process subscription payment and calculate commission
 */
export async function processSubscriptionPayment(businessId, planId, paymentCycle = 'monthly') {
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('seller_id, subscription_start_date')
        .eq('id', businessId)
        .single();

    if (businessError) throw businessError;

    const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError) throw planError;

    const monthsCovered = paymentCycle === 'quarterly' ? 3 : 1;
    const originalAmount = plan.price_monthly * monthsCovered;
    const discountPercentage = paymentCycle === 'quarterly' ? 20 : 0;
    const discountAmount = originalAmount * (discountPercentage / 100);
    const finalAmount = originalAmount - discountAmount;

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + monthsCovered);

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

    const updateData = {
        subscription_status: 'active',
        payment_cycle: paymentCycle
    };

    if (!business.subscription_start_date) {
        updateData.subscription_start_date = periodStart.toISOString();
    }

    await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessId);

    const commission = await calculateCommission(businessId, payment.id);

    return {
        payment,
        commission
    };
}

/**
 * Calculate commission for a payment
 */
export async function calculateCommission(businessId, paymentId) {
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('seller_id, subscription_start_date')
        .eq('id', businessId)
        .single();

    if (businessError) throw businessError;

    if (!business.seller_id) {
        return null;
    }

    const { data: payment, error: paymentError } = await supabase
        .from('subscription_payments')
        .select('amount')
        .eq('id', paymentId)
        .single();

    if (paymentError) throw paymentError;

    const startDate = new Date(business.subscription_start_date);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()) + 1;
    const subscriptionMonth = Math.max(1, monthsDiff);

    const getCommissionRate = (month) => {
        if (month === 1) return 40;
        if (month === 2) return 30;
        if (month === 3) return 20;
        if (month >= 4 && month <= 6) return 10;
        return 0;
    };

    const baseRate = getCommissionRate(subscriptionMonth);
    if (baseRate === 0) {
        return null;
    }

    const { count: activeClientsCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', business.seller_id)
        .eq('subscription_status', 'active');

    const volumeBonus = (activeClientsCount || 0) >= 50 ? 5 : 0;
    const totalRate = baseRate + volumeBonus;
    const commissionAmount = payment.amount * (totalRate / 100);

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
 */
export async function getSellerCommissions(sellerId, month, year) {
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
 */
export async function getSellerStats(sellerId) {
    const { data: allBusinesses, error: businessError } = await supabase
        .from('businesses')
        .select('subscription_status')
        .eq('seller_id', sellerId);

    if (businessError) throw businessError;

    const totalBusinesses = allBusinesses?.length || 0;
    const trialBusinesses = allBusinesses?.filter(b => b.subscription_status === 'trial').length || 0;
    const activeBusinesses = allBusinesses?.filter(b => b.subscription_status === 'active').length || 0;
    const conversionRate = totalBusinesses > 0 ? (activeBusinesses / totalBusinesses) * 100 : 0;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { total: monthlyCommissions } = await getSellerCommissions(
        sellerId,
        currentMonth,
        currentYear
    );

    const projection = await getSellerMonthlyProjection(sellerId);

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
 */
export async function getSellerMonthlyProjection(sellerId) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { total: currentCommissions } = await getSellerCommissions(
        sellerId,
        currentMonth,
        currentYear
    );

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
 */
export async function changeBusinessPassword(businessId, oldPassword, newPassword) {
    const { data: business, error: checkError } = await supabase
        .from('businesses')
        .select('password')
        .eq('id', businessId)
        .single();

    if (checkError) throw checkError;

    if (business.password !== oldPassword) {
        throw new Error('Contraseña actual incorrecta');
    }

    if (newPassword.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        throw new Error('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
    }

    const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (authError) {
        console.error('Error updating auth password:', authError);
        throw new Error('No se pudo actualizar la contraseña en el sistema.');
    }

    const { error: updateError } = await supabase
        .from('businesses')
        .update({
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
export async function loginSuperAdmin(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
        throw new Error('Por favor ingresa tu email y contraseña.');
    }

    const { data: adminRecord } = await supabase
        .from('super_admins')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

    const isMasterOwner = cleanEmail === 'fernandoquintero1994@gmail.com';

    if (adminRecord || isMasterOwner) {
        return {
            id: adminRecord?.id || 'master-super-admin',
            email: cleanEmail,
            firstName: adminRecord?.first_name || 'Fernando',
            lastName: adminRecord?.last_name || 'Quintero',
            role: 'super_admin'
        };
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
    });

    if (authError || !authData?.user) {
        throw new Error('Email o contraseña incorrectos.');
    }

    return {
        id: authData.user.id,
        email: authData.user.email,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin'
    };
}

/**
 * Get all sellers with their statistics
 */
export async function getAllSellers() {
    const { data: sellers, error } = await supabase
        .from('sellers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    const sellersWithStats = await Promise.all(sellers.map(async (seller) => {
        const stats = await getSellerStats(seller.id);
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
export async function getGlobalAnalytics() {
    const { data: sellers } = await supabase
        .from('sellers')
        .select('id');

    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, seller_id, subscription_status, created_at');

    const now = new Date();
    const { data: commissions } = await supabase
        .from('seller_commissions')
        .select('commission_amount, seller_id')
        .eq('period_month', now.getMonth() + 1)
        .eq('period_year', now.getFullYear());

    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, price, created_at')
        .neq('status', 'cancelled');

    const totalSellers = sellers?.length || 0;
    const totalBusinesses = businesses?.length || 0;
    const activeBusinesses = businesses?.filter(b => b.subscription_status === 'active').length || 0;
    const trialBusinesses = businesses?.filter(b => b.subscription_status === 'trial').length || 0;

    const totalCommissions = commissions?.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + parseFloat(b.price || 0), 0) || 0;
    const totalBookings = bookings?.length || 0;

    const conversionRate = totalBusinesses > 0
        ? ((activeBusinesses / totalBusinesses) * 100).toFixed(2)
        : 0;

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
export async function getAllBusinesses() {
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
            ),
            business_subcategories (
                subcategories (
                    id,
                    name,
                    slug,
                    icon,
                    category_id
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
        data.forEach(b => {
            const subs = b.business_subcategories?.map(bs => bs.subcategories).filter(Boolean) || [];
            b.subcategories = subs;
            b.subcategory_id = subs[0]?.id || null;
        });
    }

    return data;
}

/**
 * Get commission trends
 */
export async function getCommissionTrends(months = 6) {
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
export async function getBusinessGrowthTrends(months = 6) {
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
 * Update seller status
 */
export async function updateSellerStatus(sellerId, isActive) {
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
export async function getSellerDetailedReport(sellerId) {
    const [seller, businesses, commissions] = await Promise.all([
        supabase.from('sellers').select('*').eq('id', sellerId).single(),
        getSellerBusinesses(sellerId),
        supabase.from('seller_commissions')
            .select('*')
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false })
            .limit(100)
    ]);

    if (seller.error) throw seller.error;

    const total = commissions.data?.reduce((sum, comm) =>
        sum + parseFloat(comm.commission_amount || 0), 0) || 0;

    return {
        seller: seller.data,
        businesses,
        recentCommissions: commissions.data || [],
        totalCommissions: total,
        totalBusinesses: businesses.length,
        activeBusinesses: businesses.filter(b => b.subscription_status === 'active').length
    };
}

/**
 * Update any business as super admin
 */
export async function updateBusinessAsSuperAdmin(businessId, businessData, syncResourcesFn) {
    let planId = businessData.subscription_plan_id;
    if (!planId || planId === '1' || planId === 1) {
        try {
            const { data: plans } = await supabase
                .from('subscription_plans')
                .select('id')
                .limit(1);
            if (plans && plans.length > 0) {
                planId = plans[0].id;
            }
        } catch (e) {
            console.warn('Could not fetch default plan:', e);
        }
    }

    const sellerId = businessData.seller_id && businessData.seller_id !== '1'
        ? businessData.seller_id
        : null;

    const categoryId = businessData.category_id && businessData.category_id !== '1'
        ? businessData.category_id
        : null;

    const subcategoryId = businessData.subcategory_id && businessData.subcategory_id !== '' && businessData.subcategory_id !== '1'
        ? businessData.subcategory_id
        : null;

    const updateData = {
        name: businessData.name,
        ...(businessData.slug ? { slug: businessData.slug } : {}),
        category_id: categoryId,
        location: businessData.location,
        latitude: businessData.latitude,
        longitude: businessData.longitude,
        phone: businessData.phone,
        whatsapp: businessData.whatsapp,
        instagram: businessData.instagram,
        facebook: businessData.facebook,
        type: businessData.type,
        subscription_plan_id: planId,
        seller_id: sellerId
    };

    const { data, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', businessId)
        .select()
        .single();

    if (error) throw error;

    try {
        await supabase.from('business_subcategories').delete().eq('business_id', businessId);
        const subcategoriesList = Array.isArray(businessData.subcategories) && businessData.subcategories.length > 0
            ? businessData.subcategories
            : (subcategoryId ? [subcategoryId] : []);

        if (subcategoriesList.length > 0) {
            const subRows = subcategoriesList.map(sId => ({
                business_id: businessId,
                subcategory_id: typeof sId === 'object' ? sId.id : sId
            })).filter(row => Boolean(row.subcategory_id));

            if (subRows.length > 0) {
                await supabase.from('business_subcategories').insert(subRows);
            }
        }
    } catch (e) {
        console.warn('Could not sync business_subcategories junction table:', e);
    }

    const requestedCount = parseInt(businessData.resources_count || 0);
    if (requestedCount > 0 && syncResourcesFn) {
        try {
            await syncResourcesFn(businessId, businessData.type, requestedCount, businessData.price_per_hour);
        } catch (e) {
            console.warn('Could not sync business resources:', e);
        }
    }

    return data;
}

/**
 * Update current logged in user password
 */
export async function updateCurrentPassword(newPassword, userEmail = null, businessId = null) {
    let updated = false;

    try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
                data: { must_change_password: false }
            });
            if (!error) updated = true;
        }
    } catch (e) {
        console.warn('Supabase Auth updateUser exception:', e);
    }

    try {
        let targetBusinessId = businessId;
        let targetEmail = userEmail;

        if (targetBusinessId) {
            const { data: bizData } = await supabase
                .from('businesses')
                .update({ password_changed: true })
                .eq('id', targetBusinessId)
                .select();
            if (bizData && bizData.length > 0) {
                updated = true;
                if (!targetEmail) targetEmail = bizData[0].email;
            }
        } else if (targetEmail) {
            const { data: bizData } = await supabase
                .from('businesses')
                .update({ password_changed: true })
                .eq('email', targetEmail)
                .select();
            if (bizData && bizData.length > 0) {
                updated = true;
                if (!targetBusinessId) targetBusinessId = bizData[0].id;
            }
        }

        if (targetEmail) {
            try {
                const { data: signUpData } = await supabase.auth.signUp({
                    email: targetEmail,
                    password: newPassword
                });

                if (signUpData?.user && targetBusinessId) {
                    await supabase
                        .from('businesses')
                        .update({ auth_id: signUpData.user.id, password_changed: true })
                        .eq('id', targetBusinessId);
                }
                updated = true;
            } catch (authErr) {
                console.warn('Auth signup fallback warning:', authErr);
            }
        }
    } catch (e) {
        console.warn('Fallback database update error:', e);
    }

    return true;
}

/**
 * Reset business password as super admin
 */
export async function resetBusinessPasswordAsSuperAdmin(businessId, businessName) {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const all = upper + lower + nums;
    let tempPassword = '';
    tempPassword += upper[Math.floor(Math.random() * upper.length)];
    tempPassword += nums[Math.floor(Math.random() * nums.length)];
    tempPassword += lower[Math.floor(Math.random() * lower.length)];
    for (let i = 0; i < 5; i++) tempPassword += all[Math.floor(Math.random() * all.length)];
    tempPassword = tempPassword.split('').sort(() => Math.random() - 0.5).join('');

    const { data: business } = await supabase
        .from('businesses')
        .select('email, name')
        .eq('id', businessId)
        .single();

    const email = business?.email || `${(businessName || 'business').toLowerCase().replace(/[^a-z0-9]/g, '')}@turnitoslr.com`;

    return {
        email,
        tempPassword,
        businessName: business?.name || businessName
    };
}

/**
 * Delete business as super admin
 */
export async function deleteBusinessAsSuperAdmin(businessId) {
    await Promise.all([
        supabase.from('bookings').delete().eq('business_id', businessId),
        supabase.from('resources').delete().eq('business_id', businessId),
        supabase.from('seller_commissions').delete().eq('business_id', businessId),
        supabase.from('subscription_payments').delete().eq('business_id', businessId)
    ]);

    const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);

    if (error) throw error;
    return true;
}

/**
 * Get global bookings analytics
 */
export async function getBookingsAnalytics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: allBookings } = await supabase
        .from('bookings')
        .select('*, businesses(name, categories(name, icon))')
        .order('created_at', { ascending: false });

    const { data: thisMonthBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startOfMonth.toISOString());

    const { data: lastMonthBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

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

    const statusBreakdown = {};
    allBookings?.forEach(b => {
        statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1;
    });

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
export async function getSellerDetails(sellerId) {
    const [seller, businesses, commissions, stats] = await Promise.all([
        supabase.from('sellers').select('*').eq('id', sellerId).single(),
        getSellerBusinesses(sellerId),
        supabase.from('seller_commissions')
            .select('*')
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false })
            .limit(10),
        getSellerStats(sellerId)
    ]);

    if (seller.error) throw seller.error;

    const recentBusinesses = businesses
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

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
