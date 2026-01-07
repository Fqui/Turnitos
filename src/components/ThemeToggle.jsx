import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState(
        localStorage.getItem('theme') || 'light'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    return (
        <button
            onClick={toggleTheme}
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '50px',
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}
            aria-label="Toggle theme"
        >
            <span>{theme === 'light' ? '☀️' : '🌙'}</span>
            <span style={{ display: 'none', md: 'inline' }}>
                {theme === 'light' ? 'Claro' : 'Oscuro'}
            </span>
        </button>
    );
}
