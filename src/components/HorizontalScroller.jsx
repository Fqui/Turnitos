import React, { useCallback, useEffect, useRef, useState } from 'react';

const FADE = 28;

/**
 * Horizontal row that scrolls, fades out the edge that has more content
 * and (optionally) shows arrow buttons so it's obvious there is more to see.
 */
export default function HorizontalScroller({ children, gap = '8px', arrows = true, style, innerStyle, innerClassName = '', id }) {
    const ref = useRef(null);
    const [edges, setEdges] = useState({ left: false, right: false });

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

    const scrollBy = (direction) => {
        const el = ref.current;
        if (!el) return;
        el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.7, 120), behavior: 'smooth' });
    };

    const mask = `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${edges.left ? FADE : 0}px, #000 calc(100% - ${edges.right ? FADE : 0}px), ${edges.right ? 'transparent' : '#000'} 100%)`;

    const arrowStyle = (side) => ({
        position: 'absolute',
        top: '50%',
        [side]: '-6px',
        transform: 'translateY(-50%)',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        zIndex: 2
    });

    return (
        <div style={{ position: 'relative', ...style }}>
            <div
                ref={ref}
                onScroll={update}
                id={id}
                className={`no-scrollbar ${innerClassName}`.trim()}
                style={{
                    display: 'flex',
                    gap,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitMaskImage: mask,
                    maskImage: mask,
                    ...innerStyle
                }}
            >
                {children}
            </div>
            {arrows && edges.left && (
                <button type="button" aria-label="Ver anteriores" onClick={() => scrollBy(-1)} style={arrowStyle('left')}>
                    <Chevron direction="left" />
                </button>
            )}
            {arrows && edges.right && (
                <button type="button" aria-label="Ver más" onClick={() => scrollBy(1)} style={arrowStyle('right')}>
                    <Chevron direction="right" />
                </button>
            )}
        </div>
    );
}

function Chevron({ direction }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
        </svg>
    );
}
