import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
    return (
        <header style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>
                        Turnitos<span style={{ color: 'var(--primary-paddle)' }}>LR</span>
                    </div>
                </Link>
            </div>
        </header>
    );
}
