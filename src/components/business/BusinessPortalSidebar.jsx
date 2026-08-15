import React from 'react';
import { pushService } from '../../services/pushService';

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
    onCreateBooking,
    pendingCount = 0
}) => {
    const handleNavigation = (mode) => {
        setViewMode(mode);
        if (isMobile) {
            onToggleSidebar(false);
        }
    };

    const navItems = [
        { id: 'calendar', icon: '📅', label: 'Calendario' },
        { id: 'list', icon: '📋', label: 'Reservas', badge: pendingCount > 0 ? pendingCount : null },
        { id: 'analytics', icon: '📊', label: 'Analytics' },
        { id: 'customers', icon: '👥', label: 'Clientes' },
        { id: 'settings', icon: '⚙️', label: 'Ajustes' }
    ];

    return (
        <div style={{
            width: isMobile ? '100%' : (isVisible ? '260px' : '72px'),
            minWidth: isMobile ? 'auto' : (isVisible ? '260px' : '72px'),
            background: 'var(--sidebar-bg)',
            borderRight: isMobile ? 'none' : '1px solid var(--sidebar-border)',
            display: (isMobile && !isVisible) ? 'none' : 'flex',
            flexDirection: 'column',
            padding: isMobile ? '20px' : (isVisible ? '24px 16px' : '24px 8px'),
            position: isMobile ? 'fixed' : 'sticky',
            top: isMobile ? '60px' : 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: isMobile ? 'calc(100vh - 60px)' : '100vh',
            zIndex: 99,
            overflowY: 'auto',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            {/* Business Logo & Name */}
            <div style={{
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isVisible ? 'space-between' : 'center',
                flexDirection: isVisible ? 'row' : 'column',
                gap: '10px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: isVisible ? 'auto' : '100%',
                    justifyContent: isVisible ? 'flex-start' : 'center'
                }}>
                    {currentBusiness?.logo || currentBusiness?.image ? (
                        <img
                            src={currentBusiness.logo || currentBusiness.image}
                            alt="Logo"
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                objectFit: 'cover',
                                border: '2px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: '#fff',
                            fontWeight: 'bold',
                            boxShadow: 'var(--shadow-primary)'
                        }}>
                            {currentBusiness?.name ? currentBusiness.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                    )}
                    {isVisible && (
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                            <h1 style={{
                                fontSize: '16px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px'
                            }}>
                                {currentBusiness?.name || 'Portal'}
                            </h1>
                            <p style={{
                                color: 'var(--text-muted)',
                                margin: '0',
                                fontSize: '11px',
                                fontWeight: '500'
                            }}>Panel de Control</p>
                        </div>
                    )}
                </div>

                {/* Collapse Toggle (Desktop Only) */}
                {!isMobile && (
                    <button
                        onClick={() => onToggleSidebar(!isVisible)}
                        style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            transition: 'all 0.2s',
                            fontSize: '11px',
                            marginTop: isVisible ? 0 : '8px',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary-bg)';
                            e.currentTarget.style.borderColor = 'var(--primary-border)';
                            e.currentTarget.style.color = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-main)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                        title={isVisible ? "Colapsar menú" : "Expandir menú"}
                    >
                        {isVisible ? '❮' : '❯'}
                    </button>
                )}
            </div>

            {/* + New Booking Button */}
            {onCreateBooking && (
                <button
                    onClick={onCreateBooking}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: isVisible ? '10px 16px' : '10px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '13px',
                        marginBottom: '20px',
                        transition: 'all 0.2s',
                        boxShadow: 'var(--shadow-primary)',
                        width: '100%'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-primary)';
                    }}
                >
                    <span style={{ fontSize: '16px' }}>＋</span>
                    {isVisible && <span>Nueva Reserva</span>}
                </button>
            )}

            {/* Navigation */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                {navItems.map(item => {
                    const isActive = viewMode === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            title={!isVisible ? item.label : ''}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isVisible ? 'flex-start' : 'center',
                                gap: '12px',
                                padding: isVisible ? '10px 14px' : '10px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: isActive ? `3px solid var(--sidebar-active-border)` : '3px solid transparent',
                                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                                color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: isActive ? '700' : '600',
                                transition: 'all 0.15s ease',
                                textAlign: 'left',
                                width: '100%',
                                position: 'relative',
                                fontSize: '14px'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'var(--sidebar-hover-bg)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                            {isVisible && (
                                <span style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {item.label}
                                </span>
                            )}
                            {/* Badge */}
                            {item.badge && (
                                <span style={{
                                    background: 'var(--status-pending-bg, #FEF3C7)',
                                    color: 'var(--status-pending, #D97706)',
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    marginLeft: 'auto'
                                }}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div style={{
                marginTop: 'auto',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingBottom: isMobile ? '20px' : 0
            }}>
                {/* Row: Theme Toggle + Subtle Notification Button */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isVisible ? 'flex-start' : 'center',
                            gap: '8px',
                            padding: isVisible ? '9px 12px' : '9px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary-border)';
                            e.currentTarget.style.background = 'var(--primary-bg)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.background = 'var(--bg-main)';
                        }}
                    >
                        <span style={{ fontSize: '15px' }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
                        {isVisible && <span>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>}
                    </button>

                    <button
                        onClick={handleToggleNotifications}
                        title={notifGranted ? 'Notificaciones Push Activas' : 'Activar Notificaciones Push'}
                        style={{
                            flex: isVisible ? '0 0 auto' : '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '9px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: notifGranted ? '1px solid rgba(0, 230, 118, 0.35)' : '1px solid var(--border)',
                            background: notifGranted ? 'rgba(0, 230, 118, 0.1)' : 'var(--bg-main)',
                            color: notifGranted ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary-border)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = notifGranted ? 'rgba(0, 230, 118, 0.35)' : 'var(--border)';
                        }}
                    >
                        <span style={{ fontSize: '15px' }}>{notifGranted ? '🔔' : '🔕'}</span>
                        {isVisible && <span>{notifGranted ? 'Alertas On' : 'Alertas'}</span>}
                    </button>
                </div>

                {!isPwaInstalled && (
                    <button
                        onClick={handleInstallPwa}
                        title="Instalar aplicación en este dispositivo"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isVisible ? 'flex-start' : 'center',
                            gap: '8px',
                            padding: isVisible ? '9px 12px' : '9px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(0, 230, 118, 0.3)',
                            background: 'rgba(0, 230, 118, 0.08)',
                            color: 'var(--primary-paddle)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '700',
                            width: '100%',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 230, 118, 0.16)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 230, 118, 0.08)';
                        }}
                    >
                        <span style={{ fontSize: '15px' }}>📲</span>
                        {isVisible && <span>Instalar App</span>}
                    </button>
                )}

                <button
                    onClick={onLogout}
                    title={!isVisible ? 'Cerrar Sesión' : ''}
                    style={{
                        padding: isVisible ? '9px 12px' : '9px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        background: 'rgba(239, 68, 68, 0.04)',
                        color: '#EF4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isVisible ? 'flex-start' : 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        width: '100%',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.10)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.30)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                    }}
                >
                    <span style={{ fontSize: '15px' }}>🚪</span>
                    {isVisible && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </div>
    );
};

export default BusinessPortalSidebar;
