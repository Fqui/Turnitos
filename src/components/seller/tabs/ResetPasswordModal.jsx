import React, { useState } from 'react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

export default function ResetPasswordModal({ credentials, onClose }) {
    const [copied, setCopied] = useState(false);

    useBodyScrollLock(!!credentials);
    if (!credentials) return null;

    const loginUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.turnitoslr.com'}${credentials.loginPath || '/login'}`;
    const accessTarget = credentials.accessLabel || `el portal de *${credentials.businessName}*`;
    const messageText = `¡Hola! 👋 Tus nuevos datos de acceso para ${accessTarget} son:\n\n📧 *Email:* ${credentials.email}\n🔑 *Clave Provisoria:* ${credentials.tempPassword}\n\nIngresá en ${loginUrl} para acceder a tu panel. Al iniciar sesión se te solicitará configurar tu contraseña definitiva.`;

    const handleCopy = () => {
        navigator.clipboard.writeText(messageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    // Clean phone number for WhatsApp
    let phone = (credentials.whatsapp || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    if (phone.length === 10) phone = '549' + phone;
    if (phone.length === 11 && phone.startsWith('15')) phone = '549' + phone.substring(2);
    if (phone && !phone.startsWith('54') && phone.length <= 11) phone = '549' + phone;

    const handleOpenWhatsApp = () => {
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, '_blank');
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '460px',
                background: 'var(--sa-surface)',
                border: '1px solid var(--sa-border-strong)',
                borderRadius: '16px',
                padding: '26px',
                color: 'var(--sa-text)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--sa-text-muted)',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '4px 8px'
                    }}
                    title="Cerrar"
                >
                    ✕
                </button>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        margin: '0 auto 12px'
                    }}>
                        🔑
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '800', color: 'var(--sa-text)' }}>
                        Clave Provisoria Generada
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--sa-text-muted)' }}>
                        Comercio: <strong style={{ color: '#f3f4f6' }}>{credentials.businessName}</strong>
                    </p>
                </div>

                <div style={{
                    background: 'var(--sa-surface)',
                    border: '1px solid var(--sa-border)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    fontSize: '13px'
                }}>
                    <div>
                        <span style={{ color: 'var(--sa-text-muted)', fontSize: '11px', display: 'block', marginBottom: '3px' }}>
                            Email de Acceso:
                        </span>
                        <strong style={{ color: 'var(--sa-primary-text)', wordBreak: 'break-all' }}>{credentials.email}</strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--sa-text-muted)', fontSize: '11px', display: 'block', marginBottom: '3px' }}>
                            Nueva Clave Provisoria:
                        </span>
                        <strong style={{
                            color: 'var(--sa-warning)',
                            fontSize: '18px',
                            letterSpacing: '1.5px',
                            fontFamily: 'monospace',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-block'
                        }}>
                            {credentials.tempPassword}
                        </strong>
                    </div>
                    {credentials.whatsapp && (
                        <div>
                            <span style={{ color: 'var(--sa-text-muted)', fontSize: '11px', display: 'block', marginBottom: '3px' }}>
                                Teléfono / WhatsApp:
                            </span>
                            <span style={{ color: 'var(--sa-primary-text)', fontWeight: '600' }}>{credentials.whatsapp}</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {phone && (
                            <button
                                type="button"
                                onClick={handleOpenWhatsApp}
                                style={{
                                    flex: 1,
                                    padding: '11px 14px',
                                    background: '#25D366',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#000',
                                    fontWeight: '800',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>📲</span> Enviar por WhatsApp
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCopy}
                            style={{
                                flex: 1,
                                padding: '11px 16px',
                                background: copied ? '#059669' : '#10b981',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#000',
                                fontWeight: '800',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {copied ? '✓ ¡Copiado!' : '📋 Copiar Texto'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 18px',
                            background: 'var(--sa-surface-2)',
                            border: '1px solid var(--sa-border-strong)',
                            borderRadius: '10px',
                            color: 'var(--sa-text-2)',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
