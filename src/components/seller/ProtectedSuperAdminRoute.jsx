import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';

export default function ProtectedSuperAdminRoute({ children }) {
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const superAdmin = localStorage.getItem('superAdmin');

    // If already authenticated via login, render dashboard
    if (superAdmin) {
        try {
            const parsed = JSON.parse(superAdmin);
            if (parsed && (parsed.role === 'super_admin' || parsed.email)) {
                return children;
            }
        } catch (e) {
            localStorage.removeItem('superAdmin');
        }
    }

    // Otherwise, show the SuperAdmin PIN / Password security gate
    const handlePinSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Check default/master email and PIN/Password
            const result = await supabaseService.loginSuperAdmin('fernandoquintero1994@gmail.com', pin);
            if (result) {
                localStorage.setItem('superAdmin', JSON.stringify(result));
                window.location.reload(); // Refresh to mount dashboard
                return;
            }
            setError('PIN o contraseña incorrecta');
        } catch (err) {
            // Also check standard password
            setError(err.message || 'Código de seguridad incorrecto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            padding: '20px',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#1E293B',
                borderRadius: '20px',
                border: '1px solid #334155',
                padding: '36px 28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    margin: '0 auto 20px'
                }}>
                    🔐
                </div>

                <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: '#F8FAFC' }}>
                    Acceso Super Admin
                </h2>
                <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '28px', lineHeight: '1.5' }}>
                    Este panel está restringido exclusivamente a la dirección de TurnitosLR.
                </p>

                {error && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#FCA5A5',
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '20px'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handlePinSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder="Ingresá contraseña o PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            required
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid #475569',
                                backgroundColor: '#0F172A',
                                color: '#FFFFFF',
                                fontSize: '16px',
                                textAlign: 'center',
                                letterSpacing: '2px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !pin.trim()}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF',
                            fontSize: '15px',
                            fontWeight: '700',
                            border: 'none',
                            cursor: loading || !pin.trim() ? 'not-allowed' : 'pointer',
                            opacity: loading || !pin.trim() ? 0.6 : 1,
                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.2s',
                            marginBottom: '14px'
                        }}
                    >
                        {loading ? 'Verificando...' : 'Desbloquear Panel 🔓'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            fontSize: '13px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Iniciar sesión con email y contraseña
                    </button>
                </form>
            </div>
        </div>
    );
}
