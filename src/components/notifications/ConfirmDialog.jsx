import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';

const ConfirmDialog = () => {
    const { confirmDialog } = useNotification();
    const prefersReducedMotion = useReducedMotion();

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

    return (
        <AnimatePresence>
            {confirmDialog && (
                <>
                    <motion.div
                        key="confirm-dialog-backdrop"
                        onClick={confirmDialog.onCancel}
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
                        key="confirm-dialog-panel"
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDialog;
