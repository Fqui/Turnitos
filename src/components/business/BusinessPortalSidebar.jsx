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
    onLogout,
    onCreateBooking // Add prop
}) => {
    const handleNavigation = (mode) => {
        setViewMode(mode);
        if (isMobile) {
            onToggleSidebar(false);
        }
    };

    return (
        <div style={{
            width: isMobile ? '100%' : (isVisible ? '280px' : '88px'),
            background: 'var(--bg-card)',
            borderRight: isMobile ? 'none' : '1px solid var(--border)',
            display: (isMobile && !isVisible) ? 'none' : 'flex',
            flexDirection: 'column',
            padding: isMobile ? '20px' : '30px 16px',
            position: isMobile ? 'fixed' : 'sticky',
            top: isMobile ? '60px' : 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: isMobile ? 'calc(100vh - 60px)' : '100vh',
            zIndex: 99,
            overflowY: 'auto',
            transition: 'width 0.3s ease, padding 0.3s ease'
        }}>
            <div style={{
                marginBottom: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isVisible ? 'space-between' : 'center',
                flexDirection: isVisible ? 'row' : 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isVisible ? 'auto' : '100%', justifyContent: 'center' }}>
                    {currentBusiness?.logo || currentBusiness?.image ? (
                        <img
                            src={currentBusiness.logo || currentBusiness.image}
                            alt="Logo"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                        />
                    ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-paddle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', fontWeight: 'bold' }}>
                            {currentBusiness?.name ? currentBusiness.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                    )}
                    {isVisible && (
                        <div style={{ overflow: 'hidden' }}>
                            <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
                                {currentBusiness?.name || 'Portal'}
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', margin: '0', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap' }}>Panel de Control</p>
                        </div>
                    )}
                </div>

                {/* Toggle Button (Desktop) */}
                {!isMobile && (
                    <button
                        onClick={() => onToggleSidebar(!isVisible)}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'all 0.2s',
                            marginTop: isVisible ? 0 : '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-main)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title={isVisible ? "Colapsar menú" : "Expandir menú"}
                    >
                        {isVisible ? '❮' : '❯'}
                    </button>
                )}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {[
                    { id: 'calendar', icon: '📅', label: 'Calendario' },
                    { id: 'list', icon: '📋', label: 'Reservas' },
                    { id: 'analytics', icon: '📊', label: 'Analytics' },
                    { id: 'customers', icon: '👥', label: 'Clientes' },
                    { id: 'settings', icon: '⚙️', label: 'Ajustes' }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleNavigation(item.id)}
                        title={!isVisible ? item.label : ''}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isVisible ? 'flex-start' : 'center',
                            gap: '12px',
                            padding: isVisible ? '12px 16px' : '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: viewMode === item.id ? 'var(--primary-paddle)' : 'transparent',
                            color: viewMode === item.id ? '#000' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            width: '100%'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>{item.icon}</span>
                        {isVisible && <span style={{ transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: isMobile ? '20px' : 0 }}>
                <button
                    onClick={toggleTheme}
                    title={!isVisible ? (theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro') : ''}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isVisible ? 'space-between' : 'center',
                        padding: isVisible ? '10px 16px' : '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        width: '100%'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
                        {isVisible && <span>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>}
                    </div>
                </button>
                <button
                    onClick={onLogout}
                    title={!isVisible ? 'Cerrar Sesión' : ''}
                    style={{
                        padding: isVisible ? '10px 16px' : '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,68,68,0.2)',
                        background: 'rgba(255,68,68,0.05)',
                        color: '#ff4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isVisible ? 'center' : 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        width: '100%'
                    }}
                >
                    <span style={{ fontSize: '18px' }}>🚪</span>
                    {isVisible && <span>Salir</span>}
                </button>
            </div>
        </div>
    );
};

export default BusinessPortalSidebar;
