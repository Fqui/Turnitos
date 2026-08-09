import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import serviceAdapter from '../services/serviceAdapter';
import BusinessProfile from './BusinessProfile';
import VenueProfile from './VenueProfile';

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
                    return { ...navBiz, ...storedBiz };
                }
                if (storedBiz.slug === businessSlug || storedBiz.id === businessSlug) {
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
                    // ONLY merge if storedBiz actually matches this business!
                    const isMatch = (data && (String(data.id) === String(storedBiz.id) || data.slug === storedBiz.slug))
                        || (!data && (storedBiz.slug === businessSlug || storedBiz.id === businessSlug));

                    if (isMatch) {
                        finalBiz = { ...(data || {}), ...storedBiz };
                        if (storedBiz.metadata?.venue_gallery) {
                            finalBiz.metadata = { ...(finalBiz.metadata || {}), venue_gallery: storedBiz.metadata.venue_gallery };
                        }
                        if (storedBiz.gallery_images) {
                            finalBiz.gallery_images = storedBiz.gallery_images;
                        }
                    }
                }

                if (finalBiz && isMounted) {
                    setBusiness(finalBiz);
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

    const catName = (business.categories?.name || business.category || '').toLowerCase();
    const isVenueBusiness = business.type === 'venue' ||
        business.type === 'alquiler' ||
        catName.includes('alquiler') ||
        catName.includes('quincho') ||
        (business.slug || '').toLowerCase().includes('quincho') ||
        (business.slug || '').toLowerCase().includes('roma');

    // Route to appropriate profile based on business type
    if (isVenueBusiness) {
        return <VenueProfile business={business} />;
    }

    return <BusinessProfile business={business} />;
}
