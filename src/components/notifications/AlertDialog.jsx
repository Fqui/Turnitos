import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';

const AlertDialog = () => {
    const { alertDialog } = useNotification();
    const prefersReducedMotion = useReducedMotion();

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

    const backdropVariants = prefersReducedMotion
        ? {
            initial: { opacity: 1 },
            animate: { opacity: 1 },
            exit: { opacity: 0, transition: { duration: 0.15 } },
        }
        : {
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.2 } },
            exit: { opacity: 0, transition: { duration: 0.15 } },
        };

    const dialogVariants = prefersReducedMotion
        ? {
            initial: { opacity: 1, scale: 1 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 1, transition: { duration: 0.15 } },
        }
        : {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
            exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
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
            case 'success': return { bg: '#10B981', text: '#059669' };
            case 'error': return { bg: '#EF4444', text: '#DC2626' };
            case 'warning': return { bg: '#F59E0B', text: '#D97706' };
            case 'info': return { bg: '#3B82F6', text: '#2563EB' };
            default: return { bg: '#3B82F6', text: '#2563EB' };
        }
    };

    return (
        <AnimatePresence>
            {alertDialog && (
                <>
                    <motion.div
                        key="alert-dialog-backdrop"
                        onClick={alertDialog.onClose}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={backdropVariants}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 9998,
                        }}
                    />

                    <motion.div
                        key="alert-dialog-panel"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={dialogVariants}
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            x: '-50%',
                            y: '-50%',
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            padding: '32px',
                            maxWidth: '450px',
                            width: '90%',
                            zIndex: 9999,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        }}
                    >
                        {(() => {
                            const colors = getColors(alertDialog.type);
                            return (
                                <>
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
                                            padding: '14px 24px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            background: 'var(--primary-paddle, #84CC16)',
                                            color: 'white',
                                            fontWeight: '700',
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        {alertDialog.buttonText}
                                    </button>
                                </>
                            );
                        })()}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AlertDialog;