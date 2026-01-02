import React, { useState } from 'react';
import { motion } from 'framer-motion';

const BusinessLogin = ({ onLogin, loading }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password, rememberMe);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: '#1a1a1a', // Sober dark background
        }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    width: '100%',
                    height: '100vh', // Occupy 100% of the window
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}
            >
                <div style={{ width: '100%', maxWidth: '440px', padding: '20px' }}> {/* Container for form content */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            position: 'relative',
                            width: '120px', // Adjusted size for the image
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
                                    filter: 'drop-shadow(0 0 15px rgba(0, 230, 118, 0.3))' // Keep the neon glow effect
                                }}
                            />
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: 'white' }}>Bienvenidos a Turnitos<span style={{ color: 'var(--primary-paddle)' }}>LR</span></h1>
                        <p style={{ opacity: 0.7, marginTop: '8px', fontSize: '15px', fontWeight: '500' }}>Panel de Administración de Negocios</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>📧</span>
                            <input
                                type="email"
                                placeholder="Email del administrador"
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

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    style={{ accentColor: 'var(--primary-paddle)', width: '16px', height: '16px' }}
                                />
                                Recordar usuario
                            </label>

                            <button
                                type="button"
                                onClick={() => alert('Próximamente: Restablecimiento de contraseña por email.')}
                                style={{ background: 'none', border: 'none', color: 'white', fontSize: '13px', opacity: 0.6, cursor: 'pointer', fontWeight: '500' }}
                            >
                                ¿Olvidaste tu contraseña?
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
                                cursor: 'pointer',
                                fontSize: '16px',
                                boxShadow: '0 10px 20px rgba(0, 230, 118, 0.2)',
                                transition: 'all 0.2s',
                                marginTop: '10px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 230, 118, 0.3)';
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
                        <p style={{ fontSize: '14px', opacity: 0.6, marginBottom: '12px' }}>¿Sos nuevo?</p>
                        <button
                            onClick={() => window.open('https://wa.me/3804353811?text=Hola!%20Quiero%20sumar%20mi%20negocio%20a%20TurnitosLR', '_blank')}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            Quiero sumarme a TurnitosLR
                        </button>
                    </div>

                </div>
            </motion.div >
        </div >
    );
};

export default BusinessLogin;
