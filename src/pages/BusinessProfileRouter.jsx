import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import serviceAdapter from '../services/serviceAdapter';
import BusinessProfile from './BusinessProfile';
import VenueProfile from './VenueProfile';
import PageLoader from '../components/common/PageLoader';

const cleanBusinessMeta = (m) => {
    if (!m) return {};
    if (typeof m === 'string') {
        try { return JSON.parse(m); } catch (e) { return {}; }
    }
    if (typeof m === 'object' && m['0'] !== undefined) {
        try {
            const s = Object.keys(m).sort((a, b) => Number(a) - Number(b)).map(k => m[k]).join('');
            return JSON.parse(s);
        } catch (e) { return {}; }
    }
    return m;
};

export default function BusinessProfileRouter({ overrideSlug }) {
    const { businessSlug: routeSlug } = useParams();
    const businessSlug = overrideSlug || routeSlug;
    const location = useLocation();

    // Instant first paint from navigation state or this tab's cache. The database
    // is always the source of truth: cached lists never replace fresh data.
    // (localStorage 'business' belongs to the portal session and is not touched here.)
    const getInitialBusiness = () => {
        const navBiz = location.state?.business;
        if (navBiz) return { ...navBiz, metadata: cleanBusinessMeta(navBiz.metadata) };
        try {
            const raw = businessSlug ? sessionStorage.getItem(`turnitos_biz_${businessSlug}`) : null;
            if (raw) {
                const cached = JSON.parse(raw);
                return { ...cached, metadata: cleanBusinessMeta(cached.metadata) };
            }
        } catch (e) { }
        return null;
    };

    const initialBiz = getInitialBusiness();
    const [business, setBusiness] = useState(initialBiz);
    const [loading, setLoading] = useState(!initialBiz);

    useEffect(() => {
        let isMounted = true;
        const fetchBusiness = async () => {
            try {
                const data = await serviceAdapter.getBusinessBySlug(businessSlug);
                if (!isMounted) return;
                if (data) {
                    const dataMeta = cleanBusinessMeta(data.metadata);
                    setBusiness({
                        ...data,
                        metadata: {
                            ...dataMeta,
                            store_products: dataMeta?.store_products || []
                        }
                    });
                } else {
                    // Slug no longer exists: drop any cached copy
                    setBusiness(null);
                }
            } catch (error) {
                console.error('Error fetching business:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (businessSlug) {
            fetchBusiness();
        }

        return () => {
            isMounted = false;
        };
    }, [businessSlug]);

    if (loading) {
        return <PageLoader label="Cargando negocio..." />;
    }

    if (!business) {
        return <Navigate to="/" replace />;
    }

    const catName = (business.categories?.name || business.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    const isServiceCategory = business.type === 'service' ||
        catName.includes('belleza') || 
        catName.includes('estetica') || 
        catName.includes('spa') || 
        catName.includes('salud') || 
        catName.includes('mascota') ||
        catName.includes('peluqueria') ||
        catName.includes('barber') ||
        (Array.isArray(business.services) && business.services.length > 0) ||
        (Array.isArray(business.specialists) && business.specialists.length > 0);

    const isSportCategory = business.type === 'sport' ||
        catName.includes('deport') ||
        catName.includes('cancha') ||
        catName.includes('padel') ||
        catName.includes('futbol') ||
        catName.includes('tenis') ||
        (Array.isArray(business.courts) && business.courts.length > 0);

    const isExplicitVenue = business.type === 'alquiler' ||
        catName.includes('alquiler') ||
        catName.includes('quincho') ||
        catName.includes('salon') ||
        catName.includes('finca') ||
        (business.slug || '').toLowerCase().includes('quincho');

    // Route to appropriate profile based on business type
    // ONLY route to VenueProfile if it's NOT a service or sport business
    const isVenueBusiness = !isServiceCategory && !isSportCategory && (isExplicitVenue || business.type === 'venue');

    if (isVenueBusiness) {
        return <VenueProfile business={business} />;
    }

    return <BusinessProfile business={business} />;
}
