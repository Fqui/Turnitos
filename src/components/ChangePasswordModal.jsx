import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabaseService from '../services/supabaseService';

const ChangePasswordModal = ({ businessId, onPasswordChanged }) => {
    const [currentPassword, setCurrentPassword] = useState('admin123');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validatePassword = (password) => {
        if (password.length < 8) {
            return 'La contraseña debe tener al menos 8 caracteres';
        }
        if (!/[A-Z]/.test(password)) {
            return 'La contraseña debe contener al menos una mayúscula';
        }
        if (!/[a-z]/.test(password)) {
            return 'La contraseña debe contener al menos una minúscula';
        }
        if (!/[0-9]/.test(password)) {
            return 'La contraseña debe contener al menos un número';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate new password
        const validationError = validatePassword(newPassword);
        if (validationError) {
            setError(validationError);
            return;
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            await supabaseService.changeBusinessPassword(businessId, currentPassword, newPassword);
            onPasswordChanged();
        } catch (err) {
            setError(err.message || 'Error al cambiar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const strength = getPasswordStrength(newPassword);
    const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];
    const strengthLabels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'];

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
                        background: '#1a1a1a',
                        borderRadius: '24px',
                        padding: '32px',
                        maxWidth: '500px',
                        width: '100%',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
                            Cambio de Contraseña Obligatorio
                        </h2>
                        <p style={{ fontSize: '14px', opacity: 0.7, color: 'white' }}>
                            Por seguridad, debes cambiar tu contraseña antes de continuar
                        </p>
                    </div>

                    {/* Alert */}
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '12px',
                        marginBottom: '24px'
                    }}>
                        <p style={{ fontSize: '13px', color: '#60a5fa', margin: 0 }}>
                            💡 Tu contraseña actual es temporal. Crea una contraseña segura que solo tú conozcas.
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            color: '#ef4444',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Current Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                                Contraseña Actual
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 40px 12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                                Nueva Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="Mínimo 8 caracteres"
                                    style={{
                                        width: '100%',
                                        padding: '12px 40px 12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            {newPassword && (
                                <div style={{ marginTop: '8px' }}>
                                    <div style={{
                                        height: '4px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(strength / 5) * 100}%`,
                                            background: strengthColors[strength - 1] || strengthColors[0],
                                            transition: 'all 0.3s'
                                        }} />
                                    </div>
                                    <p style={{
                                        fontSize: '12px',
                                        color: strengthColors[strength - 1] || strengthColors[0],
                                        marginTop: '4px'
                                    }}>
                                        {strengthLabels[strength - 1] || strengthLabels[0]}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                                Confirmar Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Repite tu nueva contraseña"
                                    style={{
                                        width: '100%',
                                        padding: '12px 40px 12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Show Password Toggle */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: 'rgba(255,255,255,0.8)'
                        }}>
                            <input
                                type="checkbox"
                                checked={showPasswords}
                                onChange={(e) => setShowPasswords(e.target.checked)}
                                style={{ accentColor: 'var(--primary-paddle)', width: '16px', height: '16px' }}
                            />
                            Mostrar contraseñas
                        </label>

                        {/* Requirements */}
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.7)'
                        }}>
                            <p style={{ fontWeight: '600', marginBottom: '8px' }}>La contraseña debe contener:</p>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li style={{ color: newPassword.length >= 8 ? '#22c55e' : 'inherit' }}>
                                    Mínimo 8 caracteres
                                </li>
                                <li style={{ color: /[A-Z]/.test(newPassword) ? '#22c55e' : 'inherit' }}>
                                    Al menos una mayúscula
                                </li>
                                <li style={{ color: /[a-z]/.test(newPassword) ? '#22c55e' : 'inherit' }}>
                                    Al menos una minúscula
                                </li>
                                <li style={{ color: /[0-9]/.test(newPassword) ? '#22c55e' : 'inherit' }}>
                                    Al menos un número
                                </li>
                            </ul>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '14px',
                                background: 'var(--primary-paddle, #00E676)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)',
                                opacity: loading ? 0.7 : 1,
                                marginTop: '24px',
                                marginBottom: '10px'
                            }}
                        >
                            {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ChangePasswordModal;
