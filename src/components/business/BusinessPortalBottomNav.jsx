import React from 'react';

// Alto de la barra sin contar la zona segura del iPhone; el contenido deja este espacio abajo
export const BOTTOM_NAV_HEIGHT = 64;

// Barra fija abajo en celular con las secciones más usadas; "Más" abre el menú completo
const BusinessPortalBottomNav = ({
    viewMode,
    setViewMode,
    isSport,
    pendingCount = 0,
    isMenuOpen,
    onToggleMenu
}) => {
    const items = [
        { id: 'calendar', icon: '📅', label: 'Calendario' },
        { id: 'list', icon: '📋', label: 'Reservas', badge: pendingCount > 0 ? pendingCount : null },
        isSport
            ? { id: 'caja', icon: '💰', label: 'Caja' }
            : { id: 'customers', icon: '👥', label: 'Clientes' },
        { id: 'settings', icon: '⚙️', label: 'Ajustes' }
    ];
    const inBar = items.some(item => item.id === viewMode);

    const renderButton = ({ key, icon, label, badge, isActive, onClick, ariaExpanded }) => (
        <button
            key={key}
            type="button"
            onClick={onClick}
            aria-current={isActive && ariaExpanded === undefined ? 'page' : undefined}
            aria-expanded={ariaExpanded}
            aria-label={badge ? `${label} (${badge} pendientes)` : label}
            style={{
                flex: 1,
                minWidth: 0,
                minHeight: '48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                fontFamily: 'inherit',
                fontSize: '11px',
                fontWeight: isActive ? '800' : '600',
                cursor: 'pointer',
                position: 'relative',
                padding: '4px 2px'
            }}
        >
            <span style={{
                fontSize: '20px',
                lineHeight: 1,
                padding: '4px 14px',
                borderRadius: '14px',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                transition: 'background 0.15s ease'
            }}>
                {icon}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {label}
            </span>
            {badge && (
                <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: 'calc(50% + 6px)',
                    background: 'var(--status-pending, #D97706)',
                    color: '#FFFFFF',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    padding: '0 5px',
                    fontSize: '11px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                }}>
                    {badge}
                </span>
            )}
        </button>
    );

    return (
        <nav
            aria-label="Secciones del panel"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 150,
                display: 'flex',
                alignItems: 'stretch',
                minHeight: `${BOTTOM_NAV_HEIGHT}px`,
                padding: '6px 4px',
                paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border)',
                boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
                boxSizing: 'border-box'
            }}
        >
            {items.map(item => renderButton({
                key: item.id,
                icon: item.icon,
                label: item.label,
                badge: item.badge,
                isActive: !isMenuOpen && viewMode === item.id,
                onClick: () => {
                    setViewMode(item.id);
                    if (isMenuOpen) onToggleMenu(false);
                }
            }))}
            {renderButton({
                key: 'more',
                icon: isMenuOpen ? '✕' : '☰',
                label: 'Más',
                isActive: isMenuOpen || !inBar,
                ariaExpanded: !!isMenuOpen,
                onClick: () => onToggleMenu(!isMenuOpen)
            })}
        </nav>
    );
};

export default BusinessPortalBottomNav;
