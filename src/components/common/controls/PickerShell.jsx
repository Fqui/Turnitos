import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './controls.css';

const EDGE = 8;
const GAP = 6;

// Contenedor de los selectores propios.
// En celular sale como hoja desde abajo; en compu flota pegado al campo sin salirse de la ventana.
export default function PickerShell({ anchorRef, isPhone, title, onClose, width, footer, children, labelledBy }) {
    const panelRef = useRef(null);
    const [position, setPosition] = useState(null);

    useLayoutEffect(() => {
        if (isPhone) return;
        const place = () => {
            const anchor = anchorRef.current?.getBoundingClientRect();
            const panel = panelRef.current;
            if (!anchor || !panel) return;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            // Con width fijo (calendario, horario) no se estira al ancho del campo; sin width copia el campo
            const w = Math.min(width || Math.max(anchor.width, 180), vw - EDGE * 2);
            const h = panel.offsetHeight;
            const left = Math.min(Math.max(anchor.left, EDGE), vw - w - EDGE);
            // Abajo del campo; si no entra, arriba; si tampoco, donde haya más lugar
            const below = vh - anchor.bottom - GAP - EDGE;
            const above = anchor.top - GAP - EDGE;
            let top;
            if (h <= below || below >= above) top = anchor.bottom + GAP;
            else top = Math.max(anchor.top - GAP - h, EDGE);
            setPosition({ left, top, width: w, maxHeight: Math.max(below, above) });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchorRef, isPhone, width]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    // Al cerrar, el foco vuelve al campo
    useEffect(() => {
        const anchor = anchorRef.current;
        return () => anchor?.focus({ preventScroll: true });
    }, [anchorRef]);

    const stop = (e) => e.stopPropagation();

    return createPortal(
        <>
            <div
                className={`tl-picker-overlay${isPhone ? ' tl-picker-overlay--sheet' : ''}`}
                onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
                onClick={stop}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal={isPhone ? 'true' : undefined}
                aria-labelledby={labelledBy}
                aria-label={labelledBy ? undefined : title}
                className={isPhone ? 'tl-sheet' : 'tl-popover'}
                style={isPhone ? undefined : {
                    left: position?.left ?? -9999,
                    top: position?.top ?? -9999,
                    width: position?.width,
                    maxHeight: position?.maxHeight,
                    visibility: position ? 'visible' : 'hidden'
                }}
                onMouseDown={stop}
                onClick={stop}
            >
                {isPhone && (
                    <>
                        <div className="tl-sheet-handle"><span /></div>
                        <div className="tl-sheet-header">
                            <span className="tl-sheet-title">{title}</span>
                            <button type="button" className="tl-icon-btn" aria-label="Cerrar" onClick={onClose}>✕</button>
                        </div>
                    </>
                )}
                <div className="tl-picker-body">{children}</div>
                {footer && <div className="tl-picker-footer">{footer}</div>}
            </div>
        </>,
        document.body
    );
}
