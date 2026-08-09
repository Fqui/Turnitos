import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { getSubdomain } from '../utils/utils';

export default function Header() {
    const location = useLocation();
    const subdomain = getSubdomain();
    const isHome = location.pathname === '/' && !subdomain;
    // Show preview badge only on Vercel preview URLs or localhost
    const isPreview = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost');

    const handleLogoClick = (e) => {
        if (subdomain) {
            e.preventDefault();
            const parts = window.location.host.split('.');
            if (parts.length > 2) {
                // e.g. apolo.turnitoslr.com -> turnitoslr.com
                const rootDomain = parts.slice(1).join('.');
                window.location.href = `${window.location.protocol}//${rootDomain}/`;
            } else {
                window.location.href = `${window.location.protocol}//${window.location.host}/`;
            }
        }
    };

    return (
        <header style={{
            padding: '20px 0',
            background: 'var(--bg-card, #ffffff)',
            color: 'var(--text-primary, inherit)',
            borderBottom: '1px solid var(--border, transparent)',
            transition: 'all 0.3s ease'
        }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a href="/" onClick={handleLogoClick} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>
                        Turnitos<span style={{ color: '#00E676' }}>LR</span>
                        {isPreview && (
                            <span style={{ color: '#FFD700', fontSize: '0.6em', verticalAlign: 'middle', marginLeft: '5px' }}>
                                (PREVIEW)
                            </span>
                        )}
                    </div>
                </a>
                {isHome && <ThemeToggle />}
            </div>
        </header>
    );
}
