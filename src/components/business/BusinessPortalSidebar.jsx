import React from 'react';

const BusinessPortalSidebar = ({
    isVisible,
    isMobile,
    currentBusiness,
    viewMode,
    setViewMode,
    onToggleSidebar,
    theme,
    toggleTheme,
    onLogout
}) => {
    const handleNavigation = (mode) => {
        setViewMode(mode);
        if (isMobile) {
            onToggleSidebar(false);
        }
    };

    return (
        <div style={{
            width: isMobile ? '100%' : '280px',
            background: 'var(--bg-card)',
            borderRight: isMobile ? 'none' : '1px solid var(--border)',
            display: isVisible ? 'flex' : 'none',
            flexDirection: 'column',
            padding: isMobile ? '20px' : '30px 20px',
            position: isMobile ? 'fixed' : 'sticky',
            top: isMobile ? '60px' : 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: isMobile ? 'calc(100vh - 60px)' : '100vh',
            zIndex: 99,
            overflowY: 'auto'
        }}>
            <div style={{ marginBottom: '40px', display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '12px' }}>
                {currentBusiness?.logo || currentBusiness?.image ? (
                    <img
                        src={currentBusiness.logo || currentBusiness.image}
                        alt="Logo"
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                    />
                ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-paddle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', fontWeight: 'bold' }}>
                        {currentBusiness?.name ? currentBusiness.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                )}
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                        {currentBusiness?.name || 'Portal Socios'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0', fontSize: '12px', fontWeight: '500' }}>Panel de Control</p>
                </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <button
                    onClick={() => handleNavigation('calendar')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: viewMode === 'calendar' ? 'var(--primary-paddle)' : 'transparent',
                        color: viewMode === 'calendar' ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                    }}
                >
                    <span style={{ fontSize: '18px' }}>📅</span> <span style={{ color: viewMode === 'calendar' ? '#000' : 'inherit' }}>Calendario</span>
                </button>
                <button
                    onClick={() => handleNavigation('list')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: viewMode === 'list' ? 'var(--primary-paddle)' : 'transparent',
                        color: viewMode === 'list' ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                    }}
                >
                    <span style={{ fontSize: '18px' }}>📋</span> <span style={{ color: viewMode === 'list' ? '#000' : 'inherit' }}>Lista de Reservas</span>
                </button>
                <button
                    onClick={() => handleNavigation('analytics')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: viewMode === 'analytics' ? 'var(--primary-paddle)' : 'transparent',
                        color: viewMode === 'analytics' ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                    }}
                >
                    <span style={{ fontSize: '18px' }}>📊</span> <span style={{ color: viewMode === 'analytics' ? '#000' : 'inherit' }}>Analytics</span>
                </button>
                <button
                    onClick={() => handleNavigation('customers')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: viewMode === 'customers' ? 'var(--primary-paddle)' : 'transparent',
                        color: viewMode === 'customers' ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                    }}
                >
                    <span style={{ fontSize: '18px' }}>👥</span> <span style={{ color: viewMode === 'customers' ? '#000' : 'inherit' }}>Clientes</span>
                </button>
                <button
                    onClick={() => handleNavigation('settings')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: viewMode === 'settings' ? 'var(--primary-paddle)' : 'transparent',
                        color: viewMode === 'settings' ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                    }}
                >
                    <span style={{ fontSize: '18px' }}>⚙️</span> <span style={{ color: viewMode === 'settings' ? '#000' : 'inherit' }}>Configuración</span>
                </button>
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: isMobile ? '20px' : 0 }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                        <span>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
                    </div>
                    <div style={{
                        width: '32px',
                        height: '18px',
                        background: theme === 'dark' ? 'var(--primary-paddle)' : 'rgba(0,0,0,0.1)',
                        borderRadius: '10px',
                        position: 'relative',
                        transition: 'all 0.3s'
                    }}>
                        <div style={{
                            width: '14px',
                            height: '14px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: theme === 'dark' ? '16px' : '2px',
                            transition: 'all 0.3s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }} />
                    </div>
                </button>
                <button
                    onClick={onLogout}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,68,68,0.2)',
                        background: 'rgba(255,68,68,0.05)',
                        color: '#ff4444',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

export default BusinessPortalSidebar;
