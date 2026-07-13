import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';

const Toast = () => {
    const { toasts, removeToast } = useNotification();
    const prefersReducedMotion = useReducedMotion();

    const toastVariants = prefersReducedMotion
        ? {
            initial: { opacity: 1, x: 0 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: 0, transition: { duration: 0.15 } },
        }
        : {
            initial: { opacity: 0, x: '100%' },
            animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
            exit: { opacity: 0, x: '100%', transition: { duration: 0.2 } },
        };

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
            case 'success': return { bg: '#10B981', border: '#059669' };
            case 'error': return { bg: '#EF4444', border: '#DC2626' };
            case 'warning': return { bg: '#F59E0B', border: '#D97706' };
            case 'info': return { bg: '#3B82F6', border: '#2563EB' };
            default: return { bg: '#3B82F6', border: '#2563EB' };
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '400px'
        }}>
            <AnimatePresence>
                {toasts.map((toast) => {
                    const colors = getColors(toast.type);
                    return (
                        <motion.div
                            key={toast.id}
                            layout
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={toastVariants}
                            style={{
                                background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.border} 100%)`,
                                color: 'white',
                                padding: '16px 20px',
                                borderRadius: '12px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                minWidth: '300px'
                            }}
                        >
                            <div style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: '50%'
                            }}>
                                {getIcon(toast.type)}
                            </div>
                            <div style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
                                {toast.message}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    lineHeight: 1
                                }}
                            >
                                ×
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
