import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';

const SellerLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Try 1: Super admin login (the platform owner)
            try {
                const superAdmin = await supabaseService.loginSuperAdmin(email, password);
                if (superAdmin) {
                    localStorage.setItem('superAdmin', JSON.stringify(superAdmin));
                    navigate('/admin/super');
                    return;
                }
            } catch (superAdminErr) {
                // Silent fallback to next attempt
            }

            // Try 2: Seller login (captadores de negocios)
            try {
                const seller = await supabaseService.loginSeller(email, password);
                if (seller) {
                    localStorage.setItem('seller', JSON.stringify(seller));
                    navigate('/admin/dashboard');
                    return;
                }
            } catch (sellerErr) {
                // Silent fallback to next attempt
            }

            // Try 3: Business owner login (dueño del business)
                        try {
                            const business = await supabaseService.login(email, password);
                            if (business) {
                                localStorage.setItem('business', JSON.stringify(business));
                                localStorage.setItem('businessId', business.id);
                                navigate('/portal');
                                return;
                            }
                            // RPC returned null (probably the function isn't installed in DB)
                            console.warn('login_business RPC returned null — credentials may be wrong or RPC is missing');
                        } catch (businessErr) {
                            console.warn('Business owner login failed:', businessErr.message);
                        }

            // None worked
            setError('Credenciales inválidas');
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: '#1a1a1a',
        }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    width: '100%',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}
            >
                <div style={{ width: '100%', maxWidth: '440px', padding: '20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            position: 'relative',
                            width: '120px',
                            height: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <img
                                src="/logo-turnitos.png"
                                alt="Logo TurnitosLR"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 0 15px rgba(0, 230, 118, 0.3))'
                                }}
                            />
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: 'white' }}>
                            Portal <span style={{ color: 'var(--primary-paddle)' }}>TurnitosLR</span>
                        </h1>
                        <p style={{ opacity: 0.7, marginTop: '8px', fontSize: '15px', fontWeight: '500' }}>
                            Ingresa con tu email y contraseña (admin, vendedor o dueño).
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
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>📧</span>
                            <input
                                type="email"
                                placeholder="Email del vendedor"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 16px 16px 48px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.1)';
                                    e.target.style.borderColor = 'var(--primary-paddle)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.05)';
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔒</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 48px 16px 48px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.1)';
                                    e.target.style.borderColor = 'var(--primary-paddle)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.05)';
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: 0.6,
                                    fontSize: '18px'
                                }}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '16px',
                                background: 'var(--primary-paddle)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '16px',
                                fontWeight: '800',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                boxShadow: '0 10px 20px rgba(0, 230, 118, 0.2)',
                                transition: 'all 0.2s',
                                marginTop: '10px',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 230, 118, 0.3)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 230, 118, 0.2)';
                            }}
                        >
                            {loading ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div style={{ marginTop: '32px', textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', opacity: 0.6 }}>
                            ¿Problemas para ingresar? Contacta al administrador
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SellerLogin;
