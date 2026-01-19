import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedSellerRoute = ({ children }) => {
    const seller = localStorage.getItem('seller');

    if (!seller) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

export default ProtectedSellerRoute;
