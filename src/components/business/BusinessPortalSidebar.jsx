import React, { useState, useEffect } from 'react';
import { pushService } from '../../services/pushService';
import { useNotification } from '../../contexts/NotificationContext';

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
    const { showToast, showAlert } = useNotification();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isPwaInstalled, setIsPwaInstalled] = useState(false);
    const [notifGranted, setNotifGranted] = useState(
        typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
    );

    useEffect(() => {
        const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
        if (isStandalone) {
            setIsPwaInstalled(true);
        }

        const handlePrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleInstalled = () => {
            setIsPwaInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const handleInstallPwa = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsPwaInstalled(true);
                showToast('¡App instalada con éxito!', 'success');
            }
            setDeferredPrompt(null);
        } else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                showAlert('Instalar en iPhone / iPad', '1. Tocá el botón Compartir (el ícono de la flechita 📤 en Safari)\n2. Elegí "Agregar a inicio"', 'info', 'Entendido');
            } else {
                showAlert('Instalar Aplicación', '1. Tocá los 3 puntos en la esquina de tu navegador\n2. Elegí "Instalar aplicación" o "Agregar a la pantalla principal"', 'info', 'Entendido');
            }
        }
    };

    const handleToggleNotifications = async () => {
        try {
            if (typeof window === 'undefined' || !('Notification' in window)) {
                showToast('Tu navegador no soporta notificaciones push', 'warning');
                return;
            }

            if (Notification.permission === 'denied') {
                showAlert('Permisos Bloqueados', 'Los permisos de notificación están bloqueados en tu navegador.\n\nPara desbloquearlos:\n1. Tocá el ícono del Candado 🔒 o Escudo 🛡️ al lado de la barra de dirección arriba.\n2. En "Notificaciones", seleccioná "Permitir".\n3. Recargá la página.', 'warning', 'Entendido');
                setNotifGranted(false);
                return;
            }

            if (notifGranted && Notification.permission === 'granted') {
                showToast('🔔 Las alertas ya están activas en este dispositivo', 'info');
                pushService.requestPermissionAndGetTokenDetailed(currentBusiness?.id).catch(() => {});
                return;
            }

            const result = await pushService.requestPermissionAndGetTokenDetailed(currentBusiness?.id);
            if (result.success) {
                setNotifGranted(true);
                if (result.warning) {
                    showAlert('Alertas Activas', result.warning, 'info', 'Entendido');
                } else {
                    showToast('🔔 ¡Notificaciones Push activadas con éxito!', 'success');
                }
            } else {
                showToast(`⚠️ No se pudo activar: ${result.error || 'Permiso denegado'}`, 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error al configurar notificaciones', 'error');
        }
    };

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
        { id: 'subscription', icon: '💳', label: 'Suscripción' },
        { id: 'customers', icon: '👥', label: 'Clientes' },
        { id: 'settings', icon: '⚙️', label: 'Ajustes' }
    ];

    return (
        <div 
            className={!isVisible ? 'no-scrollbar' : ''}
            style={{
                width: isMobile ? '100%' : (isVisible ? '260px' : '72px'),
                minWidth: isMobile ? 'auto' : (isVisible ? '260px' : '72px'),
                background: 'var(--sidebar-bg)',
                borderRight: isMobile ? 'none' : '1px solid var(--sidebar-border)',
                display: (isMobile && !isVisible) ? 'none' : 'flex',
                flexDirection: 'column',
                padding: isMobile ? '20px' : (isVisible ? '20px 16px' : '14px 6px'),
                position: isMobile ? 'fixed' : 'sticky',
                top: isMobile ? '60px' : 0,
                left: 0,
                right: 0,
                bottom: 0,
                height: isMobile ? 'calc(100vh - 60px)' : '100vh',
                zIndex: 99,
                overflowY: isVisible ? 'auto' : 'hidden',
                overflowX: 'hidden',
                scrollbarWidth: isVisible ? 'thin' : 'none',
                msOverflowStyle: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            {/* Business Logo & Name (Desktop Only) */}
            {!isMobile && (
                <div style={{
                    marginBottom: isVisible ? '20px' : '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isVisible ? 'space-between' : 'center',
                    flexDirection: isVisible ? 'row' : 'column',
                    gap: isVisible ? '8px' : '4px',
                    width: '100%'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isVisible ? 'flex-start' : 'center',
                        gap: '12px',
                        width: isVisible ? 'auto' : '100%'
                    }}>
                        {currentBusiness?.logo || currentBusiness?.image ? (
                            <img
                                src={currentBusiness.logo || currentBusiness.image}
                                alt="Logo"
                                style={{
                                    width: isVisible ? '38px' : '34px',
                                    height: isVisible ? '38px' : '34px',
                                    borderRadius: '10px',
                                    objectFit: 'cover',
                                    border: '2px solid var(--border)',
                                    boxShadow: 'var(--shadow-sm)',
                                    flexShrink: 0
                                }}
                            />
                        ) : (
                            <div style={{
                                width: isVisible ? '38px' : '34px',
                                height: isVisible ? '38px' : '34px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isVisible ? '18px' : '16px',
                                color: '#fff',
                                fontWeight: 'bold',
                                boxShadow: 'var(--shadow-primary)',
                                flexShrink: 0
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

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => onToggleSidebar(!isVisible)}
                        style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            transition: 'all 0.2s',
                            fontSize: '11px',
                            marginTop: isVisible ? 0 : '2px',
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
                </div>
            )}

            {/* + New Booking Button */}
            {onCreateBooking && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: isVisible ? '16px' : '8px' }}>
                    <button
                        onClick={(e) => {
                            if (isMobile) onToggleSidebar(false);
                            onCreateBooking(e);
                        }}
                        title={!isVisible ? 'Nueva Reserva' : ''}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: isVisible ? '10px 16px' : '0',
                            width: isVisible ? '100%' : '38px',
                            height: isVisible ? '42px' : '38px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-primary)',
                            flexShrink: 0
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
                        <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</span>
                        {isVisible && <span>Nueva Reserva</span>}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <nav style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: isVisible ? '6px' : '4px', 
                flex: 1, 
                width: '100%', 
                alignItems: 'center' 
            }}>
                {navItems.map(item => {
                    const isActive = viewMode === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            title={!isVisible ? item.label : ''}
                            aria-label={item.badge ? `${item.label} (${item.badge} pendientes)` : item.label}
                            aria-current={isActive ? 'page' : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isVisible ? 'flex-start' : 'center',
                                gap: isVisible ? '12px' : '0px',
                                padding: isVisible ? '10px 14px' : '0px',
                                width: isVisible ? '100%' : '38px',
                                height: isVisible ? '42px' : '38px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: (isActive && isVisible) ? `3px solid var(--sidebar-active-border)` : 'none',
                                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                                color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: isActive ? '700' : '600',
                                transition: 'all 0.15s ease',
                                textAlign: 'left',
                                position: 'relative',
                                fontSize: '14px',
                                flexShrink: 0
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
                            <span style={{
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {item.icon}
                            </span>

                            {isVisible && (
                                <span style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1
                                }}>
                                    {item.label}
                                </span>
                            )}

                            {/* Badge */}
                            {item.badge && (
                                isVisible ? (
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
                                ) : (
                                    <span style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        background: 'var(--status-pending, #D97706)',
                                        color: '#FFFFFF',
                                        minWidth: '16px',
                                        height: '16px',
                                        borderRadius: '8px',
                                        padding: '0 4px',
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        pointerEvents: 'none'
                                    }}>
                                        {item.badge}
                                    </span>
                                )
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Grouped Bottom Actions */}
            <div style={{
                marginTop: 'auto',
                paddingTop: isVisible ? '12px' : '8px',
                borderTop: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                alignItems: 'center',
                paddingBottom: isMobile ? '20px' : 0
            }}>
                <div style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: isVisible ? '14px' : '10px',
                    padding: isVisible ? '6px' : '3px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: isVisible ? '6px' : '3px',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                        style={{
                            height: isVisible ? '36px' : '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isVisible ? '6px' : '0px',
                            padding: isVisible ? '0 8px' : '0',
                            borderRadius: isVisible ? '8px' : '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            minWidth: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary-paddle)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <span style={{ fontSize: isVisible ? '15px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {theme === 'dark' ? '🌙' : '☀️'}
                        </span>
                        {isVisible && (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                            </span>
                        )}
                    </button>

                    {/* Notification Button */}
                    <button
                        onClick={handleToggleNotifications}
                        title={notifGranted ? 'Alertas Push Activas' : 'Activar Notificaciones Push'}
                        style={{
                            height: isVisible ? '36px' : '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isVisible ? '6px' : '0px',
                            padding: isVisible ? '0 8px' : '0',
                            borderRadius: isVisible ? '8px' : '6px',
                            border: notifGranted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border)',
                            background: notifGranted ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
                            color: notifGranted ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            minWidth: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary-paddle)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = notifGranted ? 'rgba(16, 185, 129, 0.35)' : 'var(--border)';
                        }}
                    >
                        <span style={{ fontSize: isVisible ? '15px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {notifGranted ? '🔔' : '🔕'}
                        </span>
                        {isVisible && (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {notifGranted ? 'Alertas' : 'Alertas'}
                            </span>
                        )}
                    </button>

                    {/* Install PWA Button */}
                    {!isPwaInstalled && (
                        <button
                            onClick={handleInstallPwa}
                            title="Instalar App en este Dispositivo"
                            style={{
                                height: isVisible ? '36px' : '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: isVisible ? '6px' : '0px',
                                padding: isVisible ? '0 8px' : '0',
                                borderRadius: isVisible ? '8px' : '6px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                background: 'rgba(16, 185, 129, 0.08)',
                                color: 'var(--primary-paddle)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '700',
                                transition: 'all 0.2s',
                                minWidth: 0
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.16)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                            }}
                        >
                            <span style={{ fontSize: isVisible ? '15px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📲</span>
                            {isVisible && (
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Instalar
                                </span>
                            )}
                        </button>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={onLogout}
                        title="Cerrar Sesión"
                        style={{
                            height: isVisible ? '36px' : '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isVisible ? '6px' : '0px',
                            padding: isVisible ? '0 8px' : '0',
                            borderRadius: isVisible ? '8px' : '6px',
                            border: '1px solid rgba(239, 68, 68, 0.18)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            minWidth: 0,
                            gridColumn: isPwaInstalled ? 'span 2' : 'auto'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.18)';
                        }}
                    >
                        <span style={{ fontSize: isVisible ? '15px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚪</span>
                        {isVisible && (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isPwaInstalled ? 'Cerrar Sesión' : 'Salir'}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BusinessPortalSidebar;
