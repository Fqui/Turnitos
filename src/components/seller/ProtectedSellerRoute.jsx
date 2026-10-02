import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';

// Validates against the real Supabase session, not just localStorage
const ProtectedSellerRoute = ({ children }) => {
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        let cancelled = false;
        supabaseService.getCurrentSeller()
            .then((seller) => {
                if (cancelled) return;
                if (seller) {
                    localStorage.setItem('seller', JSON.stringify(seller));
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
    return children;
};

export default ProtectedSellerRoute;
