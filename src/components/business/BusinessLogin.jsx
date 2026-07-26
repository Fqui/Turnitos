import React, { useState } from 'react';
import { motion } from 'framer-motion';

const BusinessLogin = ({ onLogin, loading }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password, rememberMe);
    };

    const inputStyle = (field) => ({
        width: '100%',
        padding: '14px 14px 14px 46px',
        borderRadius: '12px',
        border: `1.5px solid ${focusedField === field ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255,255,255,0.08)'}`,
        background: focusedField === field ? 'rgba(99, 102, 241, 0.06)' : 'rgba(255,255,255,0.04)',
        color: 'white',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.25s ease',
        boxShadow: focusedField === field ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none'
    });

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F0F23 0%, #1a1a2e 40%, #16213e 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Subtle Background Pattern */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                pointerEvents: 'none'
            }} />

            {/* Ambient Glow */}
            <div style={{
                position: 'absolute',
                top: '-30%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '20px',
                    position: 'relative',
                    zIndex: 1
                }}
            >
                {/* Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '20px',
                    padding: '40px 32px',
                    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4)'
                }}>
                    {/* Logo & Title */}
                    <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
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
                                    filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.3))'
                                }}
                            />
                        </div>
                        <h1 style={{
                            fontSize: '22px',
                            fontWeight: '800',
                            margin: 0,
                            color: 'white',
                            letterSpacing: '-0.02em'
                        }}>
                            Bienvenidos a Turnitos<span style={{ color: '#818CF8' }}>LR</span>
                        </h1>
                        <p style={{
                            color: 'rgba(255,255,255,0.5)',
                            marginTop: '8px',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Panel de Administración de Negocios
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Email */}
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: focusedField === 'email' ? 0.9 : 0.4,
                                transition: 'opacity 0.2s',
                                fontSize: '16px'
                            }}>📧</span>
                            <input
                                type="email"
                                placeholder="Email del administrador"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                required
                                style={inputStyle('email')}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: focusedField === 'password' ? 0.9 : 0.4,
                                transition: 'opacity 0.2s',
                                fontSize: '16px'
                            }}>🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                required
                                style={{
                                    ...inputStyle('password'),
                                    paddingRight: '46px'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    padding: '4px',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>

                        {/* Remember Me */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.5)',
                            fontWeight: '500',
                            padding: '2px 0'
                        }}>
                            <div
                                onClick={() => setRememberMe(!rememberMe)}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '5px',
                                    border: `1.5px solid ${rememberMe ? '#6366F1' : 'rgba(255,255,255,0.15)'}`,
                                    background: rememberMe ? '#6366F1' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                {rememberMe && <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
                            </div>
                            Recordar mi cuenta
                        </label>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: 'none',
                                background: loading
                                    ? 'rgba(99, 102, 241, 0.4)'
                                    : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                                color: 'white',
                                fontSize: '15px',
                                fontWeight: '700',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'all 0.25s ease',
                                boxShadow: loading ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.35)',
                                marginTop: '4px',
                                letterSpacing: '0.02em'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.45)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.35)';
                            }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <span style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.6s linear infinite',
                                        display: 'inline-block'
                                    }} />
                                    Ingresando...
                                </span>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={{
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: '12px',
                    marginTop: '24px',
                    fontWeight: '500'
                }}>
                    TurnitosLR © {new Date().getFullYear()}
                </p>
            </motion.div>
        </div>
    );
};

export default BusinessLogin;
