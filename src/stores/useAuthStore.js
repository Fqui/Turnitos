import { create } from 'zustand';
import serviceAdapter from '../services/serviceAdapter';
import supabaseService from '../services/supabaseService';
import { pushService } from '../services/pushService';

export const useAuthStore = create((set, get) => ({
    businesses: [],
    selectedBusinessId: '',
    currentBusiness: null,
    isLoggedIn: false,
    loading: false,
    rememberMe: false,
    loginEmail: '',
    requirePasswordChange: false,
    currentBusinessId: null,

    // Restore the portal session: requires a real Supabase Auth session
    // (owner, assigned seller or super admin). localStorage only remembers
    // which business was open.
    checkAutoLogin: async () => {
        set({ loading: true });
        const mustChangePassword = localStorage.getItem('turnitos_must_change_password') === 'true';

        try {
            let storedBiz = null;
            try {
                storedBiz = JSON.parse(localStorage.getItem('business') || 'null');
            } catch {
                storedBiz = null;
            }

            let businessId = null;
            let role = null;

            if (serviceAdapter.isDemoMode) {
                businessId = storedBiz?.id || null;
                role = 'owner';
            } else {
                if (storedBiz?.id) {
                    role = await supabaseService.canAccessBusinessPortal(storedBiz.id);
                    if (role) businessId = storedBiz.id;
                }
                if (!businessId) {
                    businessId = await supabaseService.getSessionBusinessId();
                    role = businessId ? 'owner' : null;
                }
            }

            if (!businessId) {
                localStorage.removeItem('business');
                set({ isLoggedIn: false, loading: false });
                return;
            }

            const [businessesData, detailedBiz] = await Promise.all([
                serviceAdapter.getBusinesses(),
                serviceAdapter.getBusinessById(businessId).catch(() => null)
            ]);
            const fullBiz = detailedBiz || businessesData.find(b => String(b.id) === String(businessId)) || storedBiz;
            const finalBusinesses = businessesData.map(b => String(b.id) === String(fullBiz.id) ? fullBiz : b);
            if (!finalBusinesses.some(b => String(b.id) === String(fullBiz.id))) {
                finalBusinesses.push(fullBiz);
            }

            // Only the owner is asked to change a provisional password
            if (role === 'owner' && (mustChangePassword || fullBiz.password_changed === false)) {
                set({
                    requirePasswordChange: true,
                    currentBusinessId: fullBiz.id,
                    selectedBusinessId: fullBiz.id,
                    currentBusiness: fullBiz,
                    businesses: finalBusinesses,
                    loginEmail: fullBiz.email,
                    loading: false
                });
                return;
            }

            set({
                selectedBusinessId: fullBiz.id,
                currentBusiness: fullBiz,
                businesses: finalBusinesses,
                isLoggedIn: true,
                loginEmail: fullBiz.email,
                loading: false
            });
        } catch (err) {
            console.warn('Auto-login error:', err);
            set({ isLoggedIn: false, loading: false });
        }
    },

    login: async (email, password, remember = false) => {
        if (!email || !password) {
            throw new Error('Por favor complete todos los campos');
        }

        set({ loading: true, loginEmail: email, rememberMe: remember });
        try {
            const business = await serviceAdapter.login(email, password);
            if (!business) {
                throw new Error('Credenciales inválidas');
            }

            if (business.requirePasswordChange) {
                set({
                    requirePasswordChange: true,
                    currentBusinessId: business.id,
                    loading: false
                });
                return business;
            }

            const fullBusiness = (await serviceAdapter.getBusinessById(business.id)) || business;
            const prevBusinesses = get().businesses;
            const exists = prevBusinesses.some(b => String(b.id) === String(fullBusiness.id));
            const newBusinesses = exists
                ? prevBusinesses.map(b => String(b.id) === String(fullBusiness.id) ? fullBusiness : b)
                : [...prevBusinesses, fullBusiness];

            if (remember) {
                localStorage.setItem('turnitos_business_email', email);
            } else {
                localStorage.removeItem('turnitos_business_email');
            }
            localStorage.setItem('business', JSON.stringify(fullBusiness));

            set({
                businesses: newBusinesses,
                selectedBusinessId: business.id,
                currentBusiness: fullBusiness,
                isLoggedIn: true,
                loading: false
            });

            try {
                await pushService.requestPermissionAndGetToken(business.id);
            } catch (pushError) {
                console.warn('No se pudieron activar las notificaciones push:', pushError);
            }

            return fullBusiness;
        } catch (error) {
            set({ loading: false });
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('business');
        localStorage.removeItem('turnitos_must_change_password');
        set({
            isLoggedIn: false,
            selectedBusinessId: '',
            currentBusiness: null,
            requirePasswordChange: false,
            currentBusinessId: null
        });
    },

    setSelectedBusinessId: (id) => {
        const found = get().businesses.find(b => String(b.id) === String(id));
        set({
            selectedBusinessId: id,
            currentBusiness: found || null
        });
    },

    updateCurrentBusiness: (updatedData) => {
        set((state) => {
            const updated = { ...(state.currentBusiness || {}), ...updatedData };
            const newBusinesses = state.businesses.map(b =>
                String(b.id) === String(updated.id) ? updated : b
            );
            localStorage.setItem('business', JSON.stringify(updated));
            return {
                currentBusiness: updated,
                businesses: newBusinesses
            };
        });
    },

    setBusinesses: (businessesOrUpdater) => {
        set((state) => {
            const nextBusinesses = typeof businessesOrUpdater === 'function'
                ? businessesOrUpdater(state.businesses)
                : businessesOrUpdater;
            const found = nextBusinesses.find(b => String(b.id) === String(state.selectedBusinessId));
            return {
                businesses: nextBusinesses,
                currentBusiness: found || state.currentBusiness
            };
        });
    },

    setLoading: (loading) => set({ loading }),
    setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
    setCurrentBusinessId: (currentBusinessId) => set({ currentBusinessId }),
    setLoginEmail: (loginEmail) => set({ loginEmail }),
    setRememberMe: (rememberMe) => set({ rememberMe }),
    setRequirePasswordChange: (value) => set({ requirePasswordChange: value })
}));
