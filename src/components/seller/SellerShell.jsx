import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Store, Wallet, Moon, Sun, KeyRound, LogOut } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import ChangePasswordModal from './ChangePasswordModal';
import './superadmin.css';
import './sellerPanel.css';

const NAV = [
    { to: '/admin/dashboard', label: 'Inicio', icon: Home },
    { to: '/admin/businesses', label: 'Negocios', icon: Store },
    { to: '/admin/commissions', label: 'Comisiones', icon: Wallet }
];

function readSeller() {
    try {
        return JSON.parse(localStorage.getItem('seller')) || {};
    } catch {
        return {};
    }
}

// Frame of the seller panel: top bar, navigation (bottom bar on phones), theme and password
const SellerShell = ({ children }) => {
    const navigate = useNavigate();
    const [seller, setSeller] = useState(readSeller);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem('sa-theme');
            if (saved === 'light' || saved === 'dark') return saved;
        } catch { /* storage unavailable */ }
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('sa-theme', next); } catch { /* storage unavailable */ }
            return next;
        });
    };

    const handleLogout = async () => {
        await supabaseService.logout();
        localStorage.removeItem('seller');
        navigate('/admin/login');
    };

    const handlePasswordChanged = () => {
        const updated = { ...seller, mustChangePassword: false };
        localStorage.setItem('seller', JSON.stringify(updated));
        setSeller(updated);
        setShowPasswordModal(false);
    };

    return (
        <div className="sa-root sp-root" data-theme={theme}>
            <header className="sp-topbar">
                <div className="sp-topbar-in">
                    <div className="sp-brand">
                        <span className="sp-brand-name">TurnitosLR</span>
                        <span className="sp-brand-tag">Vendedores</span>
                    </div>
                    <nav className="sp-nav" aria-label="Secciones">
                        {NAV.map(({ to, label, icon: Icon }) => (
                            <NavLink key={to} to={to} className={({ isActive }) => `sp-nav-item${isActive ? ' is-active' : ''}`}>
                                <Icon size={18} aria-hidden="true" />
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </nav>
                    <div className="sp-tools">
                        <button type="button" className="sp-icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button type="button" className="sp-icon-btn" onClick={() => setShowPasswordModal(true)} aria-label="Cambiar contraseña" title="Cambiar contraseña">
                            <KeyRound size={18} />
                        </button>
                        <button type="button" className="sp-icon-btn" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="sp-main">{children}</main>

            {seller.mustChangePassword ? (
                <ChangePasswordModal userEmail={seller.email} onSuccess={handlePasswordChanged} />
            ) : showPasswordModal && (
                <ChangePasswordModal
                    userEmail={seller.email}
                    title="Cambiar contraseña"
                    description="Elegí una clave nueva para entrar a tu panel."
                    onSuccess={handlePasswordChanged}
                    onCancel={() => setShowPasswordModal(false)}
                />
            )}
        </div>
    );
};

export default SellerShell;
