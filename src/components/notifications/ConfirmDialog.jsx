import React, { useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

const ConfirmDialog = () => {
    const { confirmDialog } = useNotification();

    useEffect(() => {
        if (!confirmDialog) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                confirmDialog.onCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [confirmDialog]);

    if (!confirmDialog) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={confirmDialog.onCancel}
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
                <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: 'var(--text-primary)'
                }}>
                    {confirmDialog.title}
                </h3>
                <p style={{
                    margin: '0 0 24px 0',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6'
                }}>
                    {confirmDialog.message}
                </p>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={confirmDialog.onCancel}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--bg-main)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        {confirmDialog.cancelText}
                    </button>
                    <button
                        onClick={confirmDialog.onConfirm}
                        style={{
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
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        {confirmDialog.confirmText}
                    </button>
                </div>
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

export default ConfirmDialog;
