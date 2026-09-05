import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import serviceAdapter from '../services/serviceAdapter';
import BusinessProfile from './BusinessProfile';
import VenueProfile from './VenueProfile';

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

    const getInitialBusiness = () => {
        const navBiz = location.state?.business;
        try {
            const raw = localStorage.getItem('business');
            if (raw) {
                const storedBiz = JSON.parse(raw);
                if (navBiz && (String(navBiz.id) === String(storedBiz.id) || navBiz.slug === storedBiz.slug)) {
                    const merged = { ...navBiz, ...storedBiz };
                    merged.metadata = cleanBusinessMeta(merged.metadata);
                    return merged;
                }
                const cleanSub = businessSlug?.replace(/[-_]/g, '');
                if (storedBiz.slug === businessSlug || storedBiz.id === businessSlug || (cleanSub && storedBiz.slug === cleanSub)) {
                    storedBiz.metadata = cleanBusinessMeta(storedBiz.metadata);
                    return storedBiz;
                }
            }
        } catch (e) { }
        return navBiz || null;
    };

    const initialBiz = getInitialBusiness();
    const [business, setBusiness] = useState(initialBiz);
    const [loading, setLoading] = useState(!initialBiz);

    useEffect(() => {
        let isMounted = true;
        const fetchBusiness = async () => {
            try {
                if (!initialBiz) {
                    setLoading(true);
                }
                const data = await serviceAdapter.getBusinessBySlug(businessSlug);

                let storedBiz = null;
                try {
                    const raw = localStorage.getItem('business');
                    if (raw) storedBiz = JSON.parse(raw);
                } catch (e) { }

                let finalBiz = data;
                if (storedBiz) {
                    const cleanSub = businessSlug?.replace(/[-_]/g, '');
                    // ONLY merge if storedBiz actually matches this business!
                    const isMatch = (data && (String(data.id) === String(storedBiz.id) || data.slug === storedBiz.slug))
                        || (!data && (storedBiz.slug === businessSlug || storedBiz.id === businessSlug || (cleanSub && storedBiz.slug === cleanSub)));

                    if (isMatch) {
                        const storedMeta = cleanBusinessMeta(storedBiz?.metadata);
                        const dataMeta = cleanBusinessMeta(data?.metadata);
                        const resolvedProducts = (dataMeta?.store_products && dataMeta.store_products.length > 0)
                            ? dataMeta.store_products
                            : (storedMeta?.store_products || []);

                        finalBiz = {
                            ...(storedBiz || {}),
                            ...(data || {}),
                            // Explicitly keep relational lists from backend if available
                            services: (data?.services && data.services.length > 0) ? data.services : (storedBiz?.services || []),
                            specialists: (data?.specialists && data.specialists.length > 0) ? data.specialists : (storedBiz?.specialists || []),
                            store_enabled: (data?.store_enabled !== undefined) ? data.store_enabled : (storedBiz?.store_enabled !== undefined ? storedBiz.store_enabled : true),
                            metadata: {
                                ...storedMeta,
                                ...dataMeta,
                                store_products: resolvedProducts
                            }
                        };
                        if (storedBiz.metadata?.venue_gallery) {
                            finalBiz.metadata.venue_gallery = storedBiz.metadata.venue_gallery;
                        }
                        if (storedBiz.gallery_images && (!data?.gallery_images || data.gallery_images.length === 0)) {
                            finalBiz.gallery_images = storedBiz.gallery_images;
                        }
                    }
                } else if (data) {
                    const dataMeta = cleanBusinessMeta(data?.metadata);
                    finalBiz = {
                        ...data,
                        metadata: {
                            ...dataMeta,
                            store_products: dataMeta?.store_products || []
                        }
                    };
                }

                if (finalBiz && isMounted) {
                    setBusiness(finalBiz);
                    try {
                        localStorage.setItem('business', JSON.stringify(finalBiz));
                    } catch (e) { }
                }
            } catch (error) {
                console.error('Error fetching business:', error);
                if (isMounted) setLoading(false);
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
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                flex: 1,
                minHeight: '60vh',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid var(--primary-paddle)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '12px'
                }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)' }}>Cargando negocio...</div>
            </div>
        );
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
