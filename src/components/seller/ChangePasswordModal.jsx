import React, { useState } from 'react';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

const ChangePasswordModal = ({ userEmail, businessId, onSuccess, onPasswordChanged, onClose, onCancel, title, description }) => {
    useBodyScrollLock();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            await supabaseService.updateCurrentPassword(password, userEmail, businessId);
            if (typeof onSuccess === 'function') onSuccess();
            if (typeof onPasswordChanged === 'function') onPasswordChanged();
            if (typeof onClose === 'function') onClose();
        } catch (err) {
            console.error('Error updating password:', err);
            setError(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'var(--sa-surface, #111827)',
                    border: '1px solid var(--sa-border-strong, #374151)',
                    borderRadius: '16px',
                    padding: '28px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                    color: 'var(--sa-text, #f9fafb)',
                    fontFamily: 'var(--font-sans)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: '54px',
                        height: '54px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '26px',
                        margin: '0 auto 12px'
                    }}>
                        🔐
                    </div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: 'var(--sa-text, #f9fafb)' }}>
                        {title || 'Crea tu contraseña personal'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--sa-text-muted, #9ca3af)', lineHeight: '1.5' }}>
                        {description || `Estás ingresando con una contraseña provisoria (${userEmail}). Por tu seguridad, elegí una clave propia para continuar.`}
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#f87171',
                        fontSize: '12px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        textAlign: 'center'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2, #d1d5db)' }}>
                            Nueva Contraseña *
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'var(--sa-surface-2, #1e293b)',
                                border: '1px solid var(--sa-border-strong, #334155)',
                                borderRadius: '10px',
                                color: 'var(--sa-text, #ffffff)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2, #d1d5db)' }}>
                            Confirmar Nueva Contraseña *
                        </label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repetí tu nueva contraseña"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'var(--sa-surface-2, #1e293b)',
                                border: '1px solid var(--sa-border-strong, #334155)',
                                borderRadius: '10px',
                                color: 'var(--sa-text, #ffffff)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: 'var(--sa-primary, #2563eb)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '14px',
                            cursor: loading ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                        }}
                    >
                        {loading ? 'Guardando clave...' : 'Guardar e Ingresar ➔'}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{ padding: '10px', background: 'none', border: 'none', color: 'var(--sa-text-muted, #9ca3af)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                    )}
                </form>
            </motion.div>
        </div>
    );
};

export default ChangePasswordModal;
