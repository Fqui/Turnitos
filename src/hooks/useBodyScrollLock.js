import { useEffect } from 'react';

// Bloqueo de scroll del fondo mientras hay un modal abierto.
// - Cuenta referencias: si hay modales anidados, el scroll vuelve recién al cerrar el último.
// - Usa body { position: fixed; top: -scrollY } porque en iOS Safari overflow: hidden
//   en el body no alcanza para frenar el scroll táctil; al liberar se restaura la posición.
// - Compensa el ancho de la barra de scroll en desktop para que el layout no "salte".

let lockCount = 0;
let saved = null;

function lock() {
    lockCount += 1;
    if (lockCount > 1) return;

    const { body, documentElement: html } = document;
    const scrollY = window.scrollY || html.scrollTop || 0;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    saved = {
        scrollY,
        body: {
            position: body.style.position,
            top: body.style.top,
            left: body.style.left,
            right: body.style.right,
            width: body.style.width,
            overflow: body.style.overflow,
            paddingRight: body.style.paddingRight,
        },
        htmlOverflow: html.style.overflow,
    };

    if (scrollbarWidth > 0) {
        const currentPadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
}

function unlock() {
    if (lockCount === 0) return;
    lockCount -= 1;
    if (lockCount > 0 || !saved) return;

    const { body, documentElement: html } = document;
    Object.assign(body.style, saved.body);
    html.style.overflow = saved.htmlOverflow;

    // Volver a la posición previa sin animación aunque haya scroll-behavior: smooth.
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, saved.scrollY);
    html.style.scrollBehavior = prevBehavior;

    saved = null;
}

export function useBodyScrollLock(active = true) {
    useEffect(() => {
        if (!active || typeof document === 'undefined') return undefined;
        lock();
        return unlock;
    }, [active]);
}

export default useBodyScrollLock;
