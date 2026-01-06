import React, { useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

const AlertDialog = () => {
    const { alertDialog } = useNotification();

    useEffect(() => {
        if (!alertDialog) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                alertDialog.onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [alertDialog]);

    if (!alertDialog) return null;

    const getIcon = (type) => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            case 'info': return 'ℹ';
            default: return 'ℹ';
        }
    };

    const getColors = (type) => {
        switch (type) {
            case 'success': return { bg: '#10B981', text: '#059669' };
            case 'error': return { bg: '#EF4444', text: '#DC2626' };
            case 'warning': return { bg: '#F59E0B', text: '#D97706' };
            case 'info': return { bg: '#3B82F6', text: '#2563EB' };
            default: return { bg: '#3B82F6', text: '#2563EB' };
        }
    };

    const colors = getColors(alertDialog.type);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={alertDialog.onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.2s ease-out'
                }}
            />

            {/* Dialog */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--bg-card)',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
                zIndex: 9999,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                animation: 'scaleIn 0.2s ease-out'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.text} 100%)`,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '700',
                        flexShrink: 0
                    }}>
                        {getIcon(alertDialog.type)}
                    </div>
                    <h3 style={{
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: '800',
                        color: 'var(--text-primary)'
                    }}>
                        {alertDialog.title}
                    </h3>
                </div>
                <p style={{
                    margin: '0 0 24px 0',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6'
                }}>
                    {alertDialog.message}
                </p>
                <button
                    onClick={alertDialog.onClose}
                    style={{
                        width: '100%',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--primary-paddle)',
                        color: '#000',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    {alertDialog.buttonText}
                </button>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from {
                        transform: translate(-50%, -50%) scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
            `}</style>
        </>
    );
};

export default AlertDialog;
