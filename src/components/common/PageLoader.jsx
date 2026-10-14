import React from 'react';

// Shared full-page loader. Fills the viewport so the footer never jumps
// up while a page or its data is loading.
const isDarkTheme = (forceDark) => {
    if (forceDark) return true;
    if (typeof document === 'undefined') return false;
    if (document.documentElement.getAttribute('data-theme') === 'dark') return true;
    try {
        return sessionStorage.getItem('turnitos_current_theme') === 'dark';
    } catch {
        return false;
    }
};

export default function PageLoader({ label = 'Cargando...', accentColor, dark = false }) {
    const isDark = isDarkTheme(dark);

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '14px',
                flex: 1,
                width: '100%',
                minHeight: '100dvh',
                backgroundColor: isDark ? '#121212' : 'var(--bg-main, #F8FAFC)',
                color: isDark ? '#A1A1A1' : 'var(--text-secondary, #64748B)',
                animation: 'fadeIn 0.2s ease-out 0.15s both'
            }}
        >
            <div style={{
                width: '40px',
                height: '40px',
                border: isDark ? '3px solid #2E2E2E' : '3px solid var(--border, #E2E8F0)',
                borderTopColor: accentColor || 'var(--primary-paddle, #00E676)',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite'
            }} />
            {label && <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{label}</p>}
        </div>
    );
}
