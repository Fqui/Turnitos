import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Header() {
    const location = useLocation();
    const isHome = location.pathname === '/';
    // Show preview badge only on Vercel preview URLs or localhost
    const isPreview = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost');

    return (
        <header style={{ padding: '20px 0' }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>
                        Turnitos<span style={{ color: '#00E676' }}>LR</span>
                        {isPreview && (
                            <span style={{ color: '#FFD700', fontSize: '0.6em', verticalAlign: 'middle', marginLeft: '5px' }}>
                                (PREVIEW)
                            </span>
                        )}
                    </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link
                        to="/portal"
                        style={{
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                    >
                        Iniciar Sesión
                    </Link>
                    {isHome && <ThemeToggle />}
                </div>
            </div>
        </header>
    );
}
