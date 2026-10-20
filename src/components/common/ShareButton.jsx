import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Link2, X, MoreHorizontal, ChevronRight } from 'lucide-react';
import {
    hasNativeShare,
    isPhoneLayout,
    buildWhatsAppShareUrl,
    buildFacebookShareUrl,
    displayShareUrl,
    copyText,
    withTurnitosVia
} from '../../utils/share';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

const WhatsAppIcon = () => (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const FacebookIcon = () => (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 21.9v-7.7h2.6l.4-3h-3V9.3c0-.9.3-1.5 1.5-1.5h1.6V5.1a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6v7.7z" />
    </svg>
);

const InstagramIcon = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
);

const SHEET_CSS = `
@keyframes turnitos-share-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes turnitos-share-up { from { transform: translateY(100%) } to { transform: none } }
@keyframes turnitos-share-pop { from { opacity: 0; transform: translateY(8px) scale(.97) } to { opacity: 1; transform: none } }
@keyframes turnitos-share-toast { from { opacity: 0; transform: translate(-50%, 8px) } to { opacity: 1; transform: translate(-50%, 0) } }
.turnitos-share-app .turnitos-share-ic { transition: transform .15s ease }
.turnitos-share-app:hover .turnitos-share-ic { transform: translateY(-2px) }
.turnitos-share-app:focus-visible, .turnitos-share-more:focus-visible, .turnitos-share-close:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }
.turnitos-share-more:hover { background: var(--bg-input) !important }
@media (prefers-reduced-motion: reduce) { .turnitos-share-root * { animation: none !important; transition: none !important } }
`;

const APP_COLORS = {
    whatsapp: { background: '#25D366', color: '#fff' },
    facebook: { background: '#1877F2', color: '#fff' },
    instagram: { background: 'radial-gradient(circle at 30% 110%, #FDCB52 0%, #F58529 25%, #DD2A7B 60%, #8134AF 100%)', color: '#fff' },
    copy: { background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
};

function ShareSheet({ url, title, text, image, onClose }) {
    const [phone] = useState(isPhoneLayout);
    const [toast, setToast] = useState('');
    const toastTimer = useRef(null);
    const closeRef = useRef(null);

    useBodyScrollLock(true);

    useEffect(() => {
        const previousFocus = document.activeElement;
        closeRef.current?.focus({ preventScroll: true });
        // Capture phase on window, so Escape closes only this menu and not the modal behind it
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            clearTimeout(toastTimer.current);
            previousFocus?.focus?.({ preventScroll: true });
        };
    }, [onClose]);

    const showToast = (message) => {
        clearTimeout(toastTimer.current);
        setToast(message);
        toastTimer.current = setTimeout(() => setToast(''), 2200);
    };

    const copyLink = async () => {
        const ok = await copyText(url);
        if (!ok) window.prompt('Copiá el link:', url);
        return ok;
    };

    const handleCopy = async () => {
        if (await copyLink()) showToast('Link copiado');
    };

    // Instagram can't receive a link from a web page: copy it and open the app to paste it
    const handleInstagram = async () => {
        if (!(await copyLink())) return;
        showToast('Link copiado. Pegalo en Instagram');
        if (phone) setTimeout(() => { window.location.href = 'instagram://'; }, 700);
    };

    const handleMore = async () => {
        try {
            await navigator.share({ title, text, url });
            onClose();
        } catch {
            // Closed the system sheet or it failed: our menu stays open
        }
    };

    const apps = [
        { key: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon />, href: buildWhatsAppShareUrl(text, url) },
        { key: 'facebook', label: 'Facebook', icon: <FacebookIcon />, href: buildFacebookShareUrl(url) },
        { key: 'instagram', label: 'Instagram', icon: <InstagramIcon /> },
        { key: 'copy', label: 'Copiar link', icon: <Link2 size={25} strokeWidth={2.2} /> }
    ];

    const appStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '7px',
        padding: '4px 0',
        border: 'none',
        borderRadius: '12px',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        fontSize: '12px',
        fontWeight: '600',
        textDecoration: 'none',
        cursor: 'pointer'
    };

    const panelStyle = phone
        ? {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '22px 22px 0 0',
            padding: '8px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
            animation: 'turnitos-share-up .28s cubic-bezier(.2,.8,.2,1)'
        }
        : {
            position: 'relative',
            width: 'min(420px, calc(100vw - 32px))',
            borderRadius: '18px',
            padding: '18px',
            animation: 'turnitos-share-pop .2s ease'
        };

    // React events bubble through portals to the parent tree: stop them so a click here
    // doesn't close the product/service modal that holds the button
    const stop = (e) => e.stopPropagation();

    return createPortal(
        <div
            className="turnitos-share-root"
            onClick={stop}
            onMouseDown={stop}
            onPointerDown={stop}
            onTouchStart={stop}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)'
            }}
        >
            <style>{SHEET_CSS}</style>
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.5)',
                    animation: 'turnitos-share-fade .2s ease'
                }}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Compartir"
                style={{
                    ...panelStyle,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-xl)'
                }}
            >
                {phone && (
                    <div style={{ width: '38px', height: '4px', borderRadius: '4px', background: 'var(--border)', margin: '2px auto 0' }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Compartir</h3>
                    <button
                        ref={closeRef}
                        type="button"
                        className="turnitos-share-close"
                        onClick={onClose}
                        aria-label="Cerrar"
                        style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'var(--bg-input)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={15} strokeWidth={2.6} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '12px', background: 'var(--bg-input)' }}>
                    {image && (
                        <img
                            src={image}
                            alt=""
                            style={{ width: '44px', height: '44px', borderRadius: '9px', objectFit: 'cover', flex: 'none' }}
                        />
                    )}
                    <div style={{ minWidth: 0, paddingLeft: image ? 0 : '4px' }}>
                        {title && (
                            <div style={{ fontSize: '13.5px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {title}
                            </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {displayShareUrl(url)}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {apps.map(app => {
                        const content = (
                            <>
                                <span
                                    className="turnitos-share-ic"
                                    style={{
                                        width: '54px',
                                        height: '54px',
                                        borderRadius: '50%',
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        ...APP_COLORS[app.key]
                                    }}
                                >
                                    {app.icon}
                                </span>
                                {app.label}
                            </>
                        );
                        return app.href ? (
                            <a
                                key={app.key}
                                className="turnitos-share-app"
                                href={app.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                                style={appStyle}
                            >
                                {content}
                            </a>
                        ) : (
                            <button key={app.key} type="button" className="turnitos-share-app" onClick={app.key === 'instagram' ? handleInstagram : handleCopy} style={appStyle}>
                                {content}
                            </button>
                        );
                    })}
                </div>

                {hasNativeShare() && (
                    <button
                        type="button"
                        className="turnitos-share-more"
                        onClick={handleMore}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        <MoreHorizontal size={18} color="var(--text-secondary)" />
                        Más opciones
                        <ChevronRight size={18} color="var(--text-secondary)" style={{ marginLeft: 'auto' }} />
                    </button>
                )}
            </div>

            {toast && (
                <div
                    role="status"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: phone ? 'calc(24px + env(safe-area-inset-bottom, 0px))' : '32px',
                        transform: 'translateX(-50%)',
                        maxWidth: 'calc(100vw - 48px)',
                        width: 'max-content',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'var(--text-primary)',
                        color: 'var(--bg-card)',
                        fontSize: '13px',
                        fontWeight: '600',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-lg)',
                        animation: 'turnitos-share-toast .2s ease',
                        pointerEvents: 'none'
                    }}
                >
                    {toast}
                </div>
            )}
        </div>,
        document.body
    );
}

/**
 * Share a public link. Tapping it opens our own share menu (bottom sheet on phones, centered
 * modal on desktop): WhatsApp, Facebook, Instagram, Copiar link and, where the browser has it,
 * "Más opciones" with the system share sheet.
 * variant "icon": round translucent button for banners. variant "button": bordered pill with label.
 * variant "compact": same pill without the label, for tight footers.
 * variant "circle": small bordered circle, for modal headers.
 * image: optional photo shown in the menu preview.
 */
export default function ShareButton({
    url: pageUrl,
    title,
    text,
    image,
    variant = 'button',
    label = 'Compartir',
    style = {}
}) {
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);

    if (!pageUrl) return null;

    // From the TurnitosLR site the link carries ?via=turnitos (marketplace); from a business subdomain it stays clean
    const url = withTurnitosVia(pageUrl);

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

    return (
        <div style={{ position: 'relative', ...style }}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(true);
                }}
                style={buttonStyle}
                title={label}
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <Share2 size={isIcon ? 18 : 16} strokeWidth={variant === 'circle' ? 2 : 2.3} />
                {showLabel && <span>{label}</span>}
            </button>

            {open && (
                <ShareSheet
                    url={url}
                    title={title}
                    text={text}
                    image={image}
                    onClose={close}
                />
            )}
        </div>
    );
}
