import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import serviceAdapter from '../services/serviceAdapter';
import BusinessProfile from './BusinessProfile';
import VenueProfile from './VenueProfile';

export default function BusinessProfileRouter() {
    const { businessSlug } = useParams();
    const location = useLocation();
    const [business, setBusiness] = useState(location.state?.business || null);
    const [loading, setLoading] = useState(!location.state?.business);

    useEffect(() => {
        let isMounted = true;
        const fetchBusiness = async () => {
            try {
                // If we don't have business passed from router state, show loading spinner
                if (!location.state?.business) {
                    setLoading(true);
                }
                const data = await serviceAdapter.getBusinessBySlug(businessSlug);
                if (data && isMounted) {
                    setBusiness(data);
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

    // Route to appropriate profile based on business type
    if (business.type === 'venue' || business.type === 'alquiler') {
        return <VenueProfile business={business} />;
    }

    return <BusinessProfile business={business} />;
}
