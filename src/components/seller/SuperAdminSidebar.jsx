import React from 'react';
import { Sun, Moon, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SUPERADMIN_NAV } from './superAdminNav';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export default function SuperAdminSidebar({
    activeTab,
    setActiveTab,
    alertCount = 0,
    isCollapsed,
    setIsCollapsed,
    isMobile,
    isOpenMobile,
    setIsOpenMobile,
    theme,
    onToggleTheme,
    admin,
    onLogout
}) {
    const collapsed = isCollapsed && !isMobile;
    const fullName = [admin?.firstName, admin?.lastName].filter(Boolean).join(' ') || 'Super Admin';
    const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const sidebarContent = (
        <aside className={`sa-sidebar${collapsed ? ' is-collapsed' : ''}`}>
            <div className="sa-brand">
                <div className="sa-brand-logo">LR</div>
                {!collapsed && (
                    <div>
                        <div className="sa-brand-name">Turnitos<span>LR</span></div>
                        <div className="sa-brand-sub">Administración</div>
                    </div>
                )}
            </div>

            <nav>
                {SUPERADMIN_NAV.map(group => (
                    <div key={group.label} className="sa-nav-group">
                        <div className="sa-nav-label">{group.label}</div>
                        {group.items.map(item => {
                            const Icon = item.icon;
                            const badge = item.id === 'businesses' && alertCount > 0 ? alertCount : null;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`sa-nav-item${activeTab === item.id ? ' is-active' : ''}`}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        if (isMobile) setIsOpenMobile(false);
                                    }}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon size={18} strokeWidth={1.9} />
                                    {!collapsed && <span>{item.label}</span>}
                                    {badge && (
                                        <span className="sa-nav-badge" title="Negocios que requieren atención">
                                            {badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sa-sidebar-footer">
                <button
                    type="button"
                    className="sa-nav-item"
                    onClick={onToggleTheme}
                    title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                    {theme === 'dark' ? <Sun size={18} strokeWidth={1.9} /> : <Moon size={18} strokeWidth={1.9} />}
                    {!collapsed && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
                </button>

                {!isMobile && (
                    <button
                        type="button"
                        className="sa-nav-item"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                    >
                        {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.9} /> : <PanelLeftClose size={18} strokeWidth={1.9} />}
                        {!collapsed && <span>Colapsar menú</span>}
                    </button>
                )}

                <button
                    type="button"
                    className="sa-nav-item is-danger"
                    onClick={onLogout}
                    title="Cerrar sesión"
                >
                    <LogOut size={18} strokeWidth={1.9} />
                    {!collapsed && <span>Cerrar sesión</span>}
                </button>

                {!collapsed && (
                    <div className="sa-user">
                        <div className="sa-user-avatar">{initials}</div>
                        <div style={{ minWidth: 0 }}>
                            <div className="sa-user-name">{fullName}</div>
                            {admin?.email && <div className="sa-user-email">{admin.email}</div>}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );

    useBodyScrollLock(isMobile && !!isOpenMobile);
    if (isMobile) {
        if (!isOpenMobile) return null;
        return (
            <>
                <div className="sa-drawer-backdrop" onClick={() => setIsOpenMobile(false)} />
                <div className="sa-drawer">{sidebarContent}</div>
            </>
        );
    }

    return sidebarContent;
}
