import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';

// Validates against the real Supabase session, not just localStorage
const ProtectedSellerRoute = ({ children }) => {
    const [status, setStatus] = useState('checking');
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const location = useLocation();

    useEffect(() => {
        let cancelled = false;
        supabaseService.getCurrentSeller()
            .then((seller) => {
                if (cancelled) return;
                if (seller) {
                    localStorage.setItem('seller', JSON.stringify(seller));
                    setMustChangePassword(seller.mustChangePassword);
                    setStatus('ok');
                } else {
                    localStorage.removeItem('seller');
                    setStatus('denied');
                }
            })
            .catch(() => {
                if (cancelled) return;
                localStorage.removeItem('seller');
                setStatus('denied');
            });
        return () => { cancelled = true; };
    }, []);

    if (status === 'checking') return null;
    if (status === 'denied') return <Navigate to="/login" replace />;
    // With a temporary password the only stop is the dashboard, which asks for a new one
    if (mustChangePassword && location.pathname !== '/admin/dashboard') return <Navigate to="/admin/dashboard" replace />;
    return children;
};

export default ProtectedSellerRoute;
