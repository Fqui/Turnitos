import React from 'react';

export default function SuperAdminSidebar({
    activeTab,
    setActiveTab,
    alertCount = 0,
    isCollapsed,
    setIsCollapsed,
    isMobile,
    isOpenMobile,
    setIsOpenMobile,
    onOpenSearch,
    onLogout
}) {
    const navItems = [
        { id: 'overview', label: 'Dashboard', icon: '📊', description: 'Métricas y evolución' },
        { id: 'businesses', label: 'Negocios', icon: '🏢', description: 'Gestión de clubes y salones', badge: alertCount > 0 ? alertCount : null, badgeColor: '#f59e0b' },
        { id: 'sellers', label: 'Vendedores', icon: '👥', description: 'Comerciales y comisiones' },
        { id: 'bookings', label: 'Reservas Globales', icon: '🎫', description: 'Turnos de la plataforma' },
        { id: 'reviews', label: 'Reseñas & Feedback', icon: '⭐', description: 'Opiniones y WhatsApp' },
        { id: 'categories', label: 'Categorías', icon: '📁', description: 'Rubros y subcategorías' }
    ];

    const sidebarContent = (
        <aside style={{
            width: isCollapsed ? '76px' : '260px',
            height: '100vh',
            maxHeight: '100vh',
            backgroundColor: '#0a0f1d',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '18px 12px',
            transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 100,
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box'
        }}>
            {/* Top Brand Section */}
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    padding: '0 8px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    marginBottom: '16px'
                }}>
                    {!isCollapsed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                            }}>
                                ⚡
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.3px' }}>
                                    Turnitos
                                </h1>
                                <span style={{
                                    fontSize: '10px',
                                    color: '#60a5fa',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px'
                                }}>
                                    SuperAdmin Pro
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            ⚡
                        </div>
                    )}

                    {!isMobile && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#94a3b8',
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: isCollapsed ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px'
                            }}
                        >
                            ◀
                        </button>
                    )}
                </div>

                {/* Quick Search Shortcut Trigger */}
                <button
                    onClick={onOpenSearch}
                    title="Búsqueda rápida (Ctrl + K)"
                    style={{
                        width: '100%',
                        padding: isCollapsed ? '10px 0' : '9px 12px',
                        marginBottom: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                        fontSize: '12px',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔍</span>
                        {!isCollapsed && <span>Buscar...</span>}
                    </div>
                    {!isCollapsed && (
                        <kbd style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            color: '#cbd5e1'
                        }}>
                            Ctrl K
                        </kbd>
                    )}
                </button>

                {/* Navigation Items */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    if (isMobile) setIsOpenMobile(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: isCollapsed ? '10px 0' : '10px 12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: isActive
                                        ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(37, 99, 235, 0.08))'
                                        : 'transparent',
                                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                    color: isActive ? '#60a5fa' : '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isCollapsed ? 'center' : 'space-between',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    textAlign: 'left'
                                }}
                                title={item.label}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                    {!isCollapsed && (
                                        <span style={{
                                            fontSize: '13px',
                                            fontWeight: isActive ? '700' : '500',
                                            color: isActive ? '#f8fafc' : '#cbd5e1'
                                        }}>
                                            {item.label}
                                        </span>
                                    )}
                                </div>

                                {!isCollapsed && item.badge && (
                                    <span style={{
                                        padding: '2px 7px',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        backgroundColor: item.badgeColor || '#2563eb',
                                        color: '#000'
                                    }}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Actions Section */}
            <div style={{
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <button
                    onClick={onLogout}
                    style={{
                        width: '100%',
                        padding: isCollapsed ? '10px 0' : '10px 12px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '10px',
                        color: '#f87171',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                    }}
                    title="Cerrar sesión"
                >
                    <span>🚪</span>
                    {!isCollapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </aside>
    );

    if (isMobile) {
        if (!isOpenMobile) return null;
        return (
            <>
                <div
                    onClick={() => setIsOpenMobile(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 99
                    }}
                />
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 100
                    }}
                >
                    {sidebarContent}
                </div>
            </>
        );
    }

    return sidebarContent;
}
