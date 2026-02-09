import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import serviceAdapter from '../services/serviceAdapter';
import BusinessProfile from './BusinessProfile';
import VenueProfile from './VenueProfile';

export default function BusinessProfileRouter() {
    const { businessSlug } = useParams();
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBusiness();
    }, [businessSlug]);

    const fetchBusiness = async () => {
        try {
            setLoading(true);
            const data = await serviceAdapter.getBusinessBySlug(businessSlug);
            setBusiness(data);
        } catch (error) {
            console.error('Error fetching business:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                background: '#F8F9FA'
            }}>
                <div style={{ fontSize: '18px', color: '#64748B' }}>Cargando...</div>
            </div>
        );
    }

    if (!business) {
        return <Navigate to="/" replace />;
    }

    // Route to appropriate profile based on business type
    if (business.type === 'venue' || business.type === 'alquiler') {
        return <VenueProfile />;
    }

    return <BusinessProfile />;
}
