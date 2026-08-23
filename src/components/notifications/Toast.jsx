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
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '420px',
            pointerEvents: 'none'
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
                                padding: '14px 18px',
                                borderRadius: '12px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                minWidth: '280px',
                                pointerEvents: 'auto',
                                cursor: 'default'
                            }}
                        >
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.25)',
                                borderRadius: '50%',
                                flexShrink: 0
                            }}>
                                {getIcon(toast.type)}
                            </div>
                            <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', lineHeight: 1.3 }}>
                                {toast.message}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeToast(toast.id);
                                }}
                                aria-label="Cerrar"
                                style={{
                                    background: 'rgba(255,255,255,0.25)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'background 0.2s',
                                    pointerEvents: 'auto'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                            >
                                ✕
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default Toast;
