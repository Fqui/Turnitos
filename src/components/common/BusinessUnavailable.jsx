import React from 'react';
import { useNavigate } from 'react-router-dom';

// Full-page message for public business pages when the business does not
// exist ("not-found") or could not be loaded ("error", e.g. network failure).
export default function BusinessUnavailable({ variant = 'not-found', onRetry }) {
    const navigate = useNavigate();
    const isError = variant === 'error';

    const title = isError ? 'No pudimos cargar el negocio' : 'No encontramos este negocio';
    const message = isError
        ? 'Revisá tu conexión e intentá de nuevo en unos segundos.'
        : 'Puede que el link esté mal escrito o que el negocio ya no esté publicado.';

    const buttonBase = {
        fontFamily: 'var(--font-sans)',
        fontSize: '15px',
        fontWeight: 700,
        padding: '12px 22px',
        borderRadius: '12px',
        cursor: 'pointer',
        minWidth: '160px',
        flex: '1 1 160px'
    };

    return (
        <div
            role={isError ? 'alert' : 'status'}
            style={{
                minHeight: '100dvh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
                boxSizing: 'border-box',
                background: 'var(--bg-main)',
                fontFamily: 'var(--font-sans)'
            }}
        >
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '32px 24px',
                textAlign: 'center',
                boxSizing: 'border-box'
            }}>
                <div aria-hidden="true" style={{
                    width: '56px',
                    height: '56px',
                    margin: '0 auto 16px',
                    borderRadius: '50%',
                    background: 'var(--primary-bg)',
                    color: 'var(--primary-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {isError ? (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                            <path d="M21 3v5h-5" />
                        </svg>
                    ) : (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                    )}
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    {title}
                </h1>
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    {isError && onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            style={{ ...buttonBase, background: 'var(--primary)', color: '#0F172A', border: 'none' }}
                        >
                            Reintentar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{
                            ...buttonBase,
                            background: isError ? 'transparent' : 'var(--primary)',
                            color: isError ? 'var(--text-primary)' : '#0F172A',
                            border: isError ? '1px solid var(--border)' : 'none'
                        }}
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>
    );
}
