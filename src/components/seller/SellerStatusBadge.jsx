import React from 'react';

const STATUS = {
    trial: { tone: 'info', text: 'Prueba' },
    active: { tone: 'success', text: 'Activo' },
    inactive: { tone: 'muted', text: 'Inactivo' }
};

// Subscription status of a business in the seller lists
const SellerStatusBadge = ({ status }) => {
    const { tone, text } = STATUS[status] || STATUS.inactive;
    return <span className={`sp-badge sp-badge-${tone}`}>{text}</span>;
};

export default SellerStatusBadge;
