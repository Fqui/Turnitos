import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal({
    isOpen,
    title = '¿Estás seguro?',
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDanger = false,
    onConfirm,
    onClose
}) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(4px)',
                    padding: '20px'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'var(--bg-card)',
                        borderRadius: '24px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '420px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: '20px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {message && (
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                            {message}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: isDanger ? '#EF4444' : 'var(--primary-paddle)',
                                color: '#ffffff',
                                fontWeight: '700',
                                fontSize: '14px',
                                cursor: 'pointer',
                                boxShadow: isDanger ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.3)'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
