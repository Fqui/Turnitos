import React, { useState, useEffect, useRef } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import { canUseNativeShare, buildWhatsAppShareUrl } from '../../utils/share';

const WhatsAppIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

/**
 * Share a public link. On phones it opens the native share sheet; on desktop it shows
 * a small menu with "WhatsApp" and "Copiar link".
 * variant "icon": round translucent button for banners. variant "button": bordered pill with label.
 * variant "compact": same pill without the label, for tight footers.
 * variant "circle": small bordered circle, for modal headers.
 */
export default function ShareButton({
    url,
    title,
    text,
    variant = 'button',
    label = 'Compartir',
    menuPlacement = 'down',
    menuAlign = 'right',
    style = {}
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const onPointerDown = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setMenuOpen(false);
        };
        const onKeyDown = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    if (!url) return null;

    const handleClick = async (e) => {
        e.stopPropagation();
        if (canUseNativeShare()) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (err) {
                // User closed the sheet: nothing to do. Any other error falls back to our menu.
                if (err?.name === 'AbortError') return;
            }
        }
        setMenuOpen(open => !open);
    };

    const handleCopy = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            window.prompt('Copiá el link:', url);
        }
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
            setMenuOpen(false);
        }, 1400);
    };

    const isIcon = variant === 'icon';
    const showLabel = variant === 'button';

    const circleStyle = {
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
    };

    const buttonStyle = variant === 'circle' ? circleStyle : isIcon
        ? {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
        }
        : {
            padding: showLabel ? '13px 18px' : '13px 15px',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-main)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            width: showLabel ? '100%' : 'auto'
        };

    const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 12px',
        border: 'none',
        borderRadius: '10px',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontSize: '13.5px',
        fontWeight: '600',
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        textDecoration: 'none'
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
            <button
                type="button"
                onClick={handleClick}
                style={buttonStyle}
                title={label}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
            >
                <Share2 size={isIcon ? 18 : 16} strokeWidth={variant === 'circle' ? 2 : 2.3} />
                {showLabel && <span>{label}</span>}
            </button>

            {menuOpen && (
                <div
                    role="menu"
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        [menuPlacement === 'up' ? 'bottom' : 'top']: 'calc(100% + 8px)',
                        [menuAlign === 'left' ? 'left' : 'right']: 0,
                        minWidth: '190px',
                        padding: '6px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
                        zIndex: 50
                    }}
                >
                    <a
                        role="menuitem"
                        href={buildWhatsAppShareUrl(text, url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMenuOpen(false)}
                        style={itemStyle}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <WhatsAppIcon />
                        <span>WhatsApp</span>
                    </a>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleCopy}
                        style={itemStyle}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {copied ? <Check size={16} color="#16a34a" /> : <Link2 size={16} />}
                        <span>{copied ? '¡Link copiado!' : 'Copiar link'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
