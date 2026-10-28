import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FADE = 28;
const DRAG_THRESHOLD = 5;
const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)';

const matchesDesktop = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(DESKTOP_QUERY).matches;

function useIsDesktopPointer(enabled) {
    const [isDesktop, setIsDesktop] = useState(() => enabled && matchesDesktop());
    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mq = window.matchMedia(DESKTOP_QUERY);
        const onChange = () => setIsDesktop(mq.matches);
        onChange();
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, [enabled]);
    return enabled && isDesktop;
}

/**
 * Horizontal row that scrolls, fades out the edge that has more content
 * and (optionally) shows arrow buttons so it's obvious there is more to see.
 * With `mouseControls`, on desktop (mouse/trackpad) it also shows the arrows,
 * turns the vertical wheel into horizontal scroll and lets you drag the row.
 * On touch devices it stays a plain native scroller.
 */
export default function HorizontalScroller({ children, gap = '8px', arrows = true, mouseControls = false, arrowTop = '50%', style, innerStyle, innerClassName = '', id }) {
    const ref = useRef(null);
    const dragRef = useRef(null);
    const suppressClickRef = useRef(false);
    const [edges, setEdges] = useState({ left: false, right: false });
    const [dragging, setDragging] = useState(false);
    const desktopControls = useIsDesktopPointer(mouseControls);
    const showArrows = arrows || desktopControls;

    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const left = el.scrollLeft > 2;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
    }, []);

    useEffect(() => {
        update();
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(update);
        observer.observe(el);
        Array.from(el.children).forEach(child => observer.observe(child));
        return () => observer.disconnect();
    }, [update, children]);

    // Vertical mouse wheel -> horizontal scroll, only while the row can still move that way
    useEffect(() => {
        const el = ref.current;
        if (!el || !desktopControls) return undefined;
        const onWheel = (e) => {
            if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            const max = el.scrollWidth - el.clientWidth;
            if (max <= 2) return;
            const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * el.clientWidth : e.deltaY;
            const canMove = delta > 0 ? el.scrollLeft < max - 2 : el.scrollLeft > 2;
            if (!canMove) return;
            e.preventDefault();
            el.scrollBy({ left: delta, behavior: 'smooth' });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [desktopControls]);

    const scrollBy = (direction) => {
        const el = ref.current;
        if (!el) return;
        const [first, second] = el.children;
        const itemStep = first && second ? second.offsetLeft - first.offsetLeft : 0;
        const amount = itemStep > 0 ? itemStep * 3 : Math.max(el.clientWidth * 0.7, 120);
        el.scrollBy({ left: direction * amount, behavior: 'smooth' });
    };

    const setFreeScroll = (el, free) => {
        // Snap and smooth scrolling fight the drag, so they are paused while dragging
        if (free) {
            el.style.setProperty('scroll-snap-type', 'none', 'important');
            el.style.setProperty('scroll-behavior', 'auto', 'important');
        } else {
            el.style.removeProperty('scroll-snap-type');
            el.style.removeProperty('scroll-behavior');
        }
    };

    const onPointerDown = (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        const el = ref.current;
        if (!el || el.scrollWidth - el.clientWidth <= 2) return;
        suppressClickRef.current = false;
        dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startScroll: el.scrollLeft, active: false };
    };

    const onPointerMove = (e) => {
        const drag = dragRef.current;
        const el = ref.current;
        if (!drag || !el || e.pointerId !== drag.pointerId) return;
        const dx = e.clientX - drag.startX;
        if (!drag.active) {
            if (Math.abs(dx) <= DRAG_THRESHOLD) return;
            drag.active = true;
            suppressClickRef.current = true;
            setFreeScroll(el, true);
            el.setPointerCapture?.(e.pointerId);
            setDragging(true);
        }
        el.scrollLeft = drag.startScroll - dx;
    };

    const endDrag = (e) => {
        const drag = dragRef.current;
        const el = ref.current;
        if (!drag || e.pointerId !== drag.pointerId) return;
        dragRef.current = null;
        if (!drag.active || !el) return;
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
        setFreeScroll(el, false);
        setDragging(false);
    };

    // After a drag, swallow the click so it doesn't open the item under the mouse
    const onClickCapture = (e) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
    };

    const mask = `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${edges.left ? FADE : 0}px, #000 calc(100% - ${edges.right ? FADE : 0}px), ${edges.right ? 'transparent' : '#000'} 100%)`;

    const arrowStyle = (side) => ({
        position: 'absolute',
        top: arrowTop,
        [side]: '-6px',
        transform: 'translateY(-50%)',
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        zIndex: 2
    });

    const mouseHandlers = desktopControls ? {
        onPointerDown,
        onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onClickCapture,
        onDragStart: (e) => e.preventDefault()
    } : {};

    return (
        <div style={{ position: 'relative', ...style }}>
            <div
                ref={ref}
                onScroll={update}
                id={id}
                className={`no-scrollbar ${innerClassName}`.trim()}
                {...mouseHandlers}
                style={{
                    display: 'flex',
                    gap,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitMaskImage: mask,
                    maskImage: mask,
                    ...(dragging ? { cursor: 'grabbing', userSelect: 'none' } : {}),
                    ...innerStyle
                }}
            >
                {children}
            </div>
            {showArrows && edges.left && (
                <button type="button" aria-label="Ver anteriores" onClick={() => scrollBy(-1)} style={arrowStyle('left')}>
                    <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>
            )}
            {showArrows && edges.right && (
                <button type="button" aria-label="Ver más" onClick={() => scrollBy(1)} style={arrowStyle('right')}>
                    <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
