import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MENU_WIDTH = 200;
const EDGE = 8;

// Menú de acciones de un horario o una reserva.
// En celular sale como hoja desde abajo; en compu flota sobre la celda sin salirse de la ventana.
export default function SlotActionMenu({
    anchor,
    title,
    items,
    onClose,
    className,
    isMobile
}) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState(null);

    useLayoutEffect(() => {
        if (isMobile || !menuRef.current) return;
        const height = menuRef.current.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const left = Math.min(Math.max(anchor.x - MENU_WIDTH / 2, EDGE), vw - MENU_WIDTH - EDGE);
        // Arriba de la celda; si no entra, abajo
        let top = anchor.y - height - EDGE;
        if (top < EDGE) top = (anchor.bottom ?? anchor.y) + EDGE;
        top = Math.min(Math.max(top, EDGE), vh - height - EDGE);
        setPosition({ left, top });
    }, [anchor, isMobile]);

    const menu = (
        <>
            <div
                className={`${className}-overlay`}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1100,
                    background: isMobile ? 'rgba(0,0,0,0.45)' : 'transparent'
                }}
                onClick={onClose}
            />
            <div
                ref={menuRef}
                className={className}
                role="menu"
                style={isMobile ? {
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'var(--bg-card)',
                    borderRadius: '20px 20px 0 0',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
                    borderTop: '1px solid var(--border)',
                    zIndex: 1101,
                    paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
                    animation: 'slotSheetUp 0.2s ease-out'
                } : {
                    position: 'fixed',
                    left: position?.left ?? -9999,
                    top: position?.top ?? -9999,
                    width: `${MENU_WIDTH}px`,
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    border: '1px solid var(--border)',
                    zIndex: 1101,
                    overflow: 'hidden',
                    visibility: position ? 'visible' : 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
                        <span style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
                    </div>
                )}
                <div style={{
                    padding: isMobile ? '8px 12px 8px 20px' : '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isMobile ? 'transparent' : 'rgba(0,0,0,0.02)'
                }}>
                    <span style={{ fontSize: isMobile ? '13px' : '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {title}
                    </span>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        style={{
                            border: 'none',
                            background: 'none',
                            padding: '4px',
                            width: isMobile ? '44px' : 'auto',
                            height: isMobile ? '44px' : 'auto',
                            cursor: 'pointer',
                            fontSize: '18px',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        ✕
                    </button>
                </div>
                {items.map((item, i) => (
                    <button
                        key={item.label}
                        role="menuitem"
                        onClick={item.onClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            width: '100%',
                            minHeight: isMobile ? '52px' : 'auto',
                            padding: isMobile ? '12px 20px' : '12px 16px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: isMobile ? '16px' : '14px',
                            fontWeight: item.fontWeight || '500',
                            color: item.color || 'var(--text-primary)',
                            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                            transition: 'background 0.2s',
                            fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <span style={{ fontSize: isMobile ? '20px' : '18px' }}>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>
            {isMobile && (
                <style>{`
                    @keyframes slotSheetUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                `}</style>
            )}
        </>
    );

    return createPortal(menu, document.body);
}
