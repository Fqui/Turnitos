import React, { useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

// Celular: los avisos del panel (suscripción, notificaciones, perfil, turnos sin cerrar, recordatorios)
// van juntos en una franja que se despliega. Cada aviso decide solo si se muestra; acá se cuentan.
export default function PhoneAlertsStrip({ children }) {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const listRef = useRef(null);

    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el) return undefined;
        const update = () => setCount(el.childElementCount);
        update();
        const observer = new MutationObserver(update);
        observer.observe(el, { childList: true });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="pm-alerts" hidden={count === 0}>
            <button
                type="button"
                className="pm-alerts-toggle"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
            >
                <AlertTriangle size={18} aria-hidden="true" />
                <span className="pm-alerts-title">
                    {count} {count === 1 ? 'cosa para revisar' : 'cosas para revisar'}
                </span>
                <ChevronDown size={18} aria-hidden="true" className={open ? 'is-open' : undefined} />
            </button>
            {/* Always mounted so the notices can be counted; only shown when open */}
            <div ref={listRef} className="pm-alerts-list" hidden={!open}>
                {children}
            </div>
        </div>
    );
}
