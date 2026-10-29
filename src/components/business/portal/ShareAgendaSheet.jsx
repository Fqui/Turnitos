import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Share2 } from 'lucide-react';
import serviceAdapter from '../../../services/serviceAdapter';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { buildBusinessShareUrl, displayShareUrl, isPhoneLayout } from '../../../utils/share';
import { getCoverImage } from '../../../utils/imageUtils';
import { parseFrame } from '../../../utils/imageFrame';
import { getAgendaOptions, buildAgendaDays, nextDates, toDateKey } from '../../../utils/openAgenda';
import {
    STORY_TEMPLATES,
    loadStoryFonts,
    loadStoryImage,
    drawAgendaStory,
    storyToBlob
} from '../../../utils/agendaStory';

const DAY_CHOICES = [
    { value: 3, label: 'Próx. 3 días' },
    { value: 5, label: 'Próx. 5 días' },
    { value: 7, label: 'Semana' }
];
const MAX_CHOICES = [
    { value: 4, label: 'Hasta 4' },
    { value: 6, label: 'Hasta 6' }
];

const SHEET_CSS = `
@keyframes agenda-sheet-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes agenda-sheet-up { from { transform: translateY(100%) } to { transform: none } }
@keyframes agenda-sheet-pop { from { opacity: 0; transform: translateY(8px) scale(.98) } to { opacity: 1; transform: none } }
.agenda-chip { border: 1px solid var(--border); background: transparent; color: var(--text-primary); border-radius: 999px; padding: 7px 12px; font: 600 13px var(--font-sans); cursor: pointer; transition: background .15s, color .15s, border-color .15s }
.agenda-chip:hover { border-color: var(--text-secondary) }
.agenda-chip[aria-pressed="true"] { background: var(--text-primary); color: var(--bg-card); border-color: var(--text-primary) }
.agenda-chip:focus-visible, .agenda-btn:focus-visible, .agenda-close:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }
.agenda-select { width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font: 600 14px var(--font-sans) }
.agenda-select:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }
.agenda-btn { display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 12px; font: 700 14px var(--font-sans); cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-primary) }
.agenda-btn:disabled { opacity: .5; cursor: default }
.agenda-btn.main { background: var(--primary); border-color: var(--primary); color: #fff }
@media (prefers-reduced-motion: reduce) { .agenda-sheet-root * { animation: none !important; transition: none !important } }
`;

function ChipGroup({ label, choices, value, onChange }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>{label}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {choices.map(choice => (
                    <button
                        key={choice.value}
                        type="button"
                        className="agenda-chip"
                        aria-pressed={value === choice.value}
                        onClick={() => onChange(choice.value)}
                    >
                        {choice.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function ShareAgendaSheet({ business, onClose }) {
    const [phone] = useState(isPhoneLayout);
    const options = useMemo(() => getAgendaOptions(business), [business]);
    const [dayCount, setDayCount] = useState(5);
    const [optionKey, setOptionKey] = useState(() => options[0]?.key || null);
    const [maxPerDay, setMaxPerDay] = useState(4);
    const [template, setTemplate] = useState('elegant');
    const [bookingsByDate, setBookingsByDate] = useState(null);
    const [assets, setAssets] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const canvasRef = useRef(null);
    const closeRef = useRef(null);

    useBodyScrollLock(true);

    const link = displayShareUrl(buildBusinessShareUrl(business?.slug));
    const option = options.find(o => o.key === optionKey) || options[0] || null;

    useEffect(() => {
        const previousFocus = document.activeElement;
        closeRef.current?.focus({ preventScroll: true });
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            previousFocus?.focus?.({ preventScroll: true });
        };
    }, [onClose]);

    // Bookings of the week (and yesterday: rentals that cross midnight), one query per day
    useEffect(() => {
        if (!business?.id) return undefined;
        let cancelled = false;
        const today = new Date();
        const dates = nextDates(8, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
        Promise.all(dates.map(async date => {
            const key = toDateKey(date);
            const { bookings } = await serviceAdapter.getPublicBookings(business.id, key);
            return [key, bookings || []];
        }))
            .then(entries => { if (!cancelled) setBookingsByDate(Object.fromEntries(entries)); })
            .catch(error => {
                console.error('Error loading bookings for the agenda:', error);
                if (!cancelled) setLoadError(true);
            });
        return () => { cancelled = true; };
    }, [business?.id]);

    // Fonts, logo and cover before the first drawing
    useEffect(() => {
        let cancelled = false;
        const coverUrl = getCoverImage(business, business?.image);
        Promise.all([
            loadStoryFonts(),
            loadStoryImage(business?.logo),
            loadStoryImage(coverUrl)
        ]).then(([, logo, cover]) => {
            if (!cancelled) setAssets({ logo, cover, coverFrame: parseFrame(coverUrl || '').frame });
        });
        return () => { cancelled = true; };
    }, [business]);

    const days = useMemo(() => {
        if (!bookingsByDate || !option) return [];
        return buildAgendaDays(business, option, nextDates(dayCount), bookingsByDate, maxPerDay);
    }, [business, option, dayCount, bookingsByDate, maxPerDay]);

    const ready = Boolean(bookingsByDate && assets);
    const hasDays = days.length > 0;

    const draw = useCallback((withImages = true) => {
        const canvas = canvasRef.current;
        if (!canvas || !assets) return null;
        return drawAgendaStory(canvas, {
            template,
            name: business?.name || '',
            link,
            color: business?.brand_color || business?.primary_color || business?.button_color || '',
            logo: withImages ? assets.logo : null,
            cover: withImages ? assets.cover : null,
            coverFrame: assets.coverFrame,
            days,
            columns: maxPerDay
        });
    }, [assets, template, business, link, days, maxPerDay]);

    useEffect(() => {
        if (ready) draw();
    }, [ready, draw]);

    // PNG; if an image tainted the canvas, it is drawn again without photos
    const makeFile = async () => {
        let blob = await storyToBlob(draw(true));
        if (!blob) blob = await storyToBlob(draw(false));
        draw(true);
        if (!blob) return null;
        return new File([blob], `agenda-${business?.slug || 'turnos'}.png`, { type: 'image/png' });
    };

    const downloadFile = (file) => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleDownload = async () => {
        setBusy(true);
        setNotice('');
        const file = await makeFile();
        setBusy(false);
        if (!file) {
            setNotice('No se pudo generar la imagen. Probá de nuevo.');
            return;
        }
        downloadFile(file);
    };

    const handleShare = async () => {
        setBusy(true);
        setNotice('');
        const file = await makeFile();
        setBusy(false);
        if (!file) {
            setNotice('No se pudo generar la imagen. Probá de nuevo.');
            return;
        }
        const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
        if (!canShareFile) {
            downloadFile(file);
            setNotice('Este navegador no comparte imágenes: la descargamos para que la subas.');
            return;
        }
        try {
            await navigator.share({ files: [file], title: `Agenda abierta · ${business?.name || ''}` });
        } catch (error) {
            // Closed the system sheet: nothing to do. Any other failure: download it
            if (error?.name !== 'AbortError') downloadFile(file);
        }
    };

    const panelStyle = phone
        ? {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '94dvh',
            borderRadius: '22px 22px 0 0',
            padding: '8px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
            animation: 'agenda-sheet-up .28s cubic-bezier(.2,.8,.2,1)'
        }
        : {
            position: 'relative',
            width: 'min(860px, calc(100vw - 32px))',
            maxHeight: 'calc(100dvh - 48px)',
            borderRadius: '18px',
            padding: '20px 22px',
            animation: 'agenda-sheet-pop .2s ease'
        };

    const preview = (
        <div style={{
            position: 'relative',
            width: phone ? 'min(62vw, 240px)' : '100%',
            maxWidth: '300px',
            margin: '0 auto',
            aspectRatio: '9 / 16',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            flexShrink: 0
        }}>
            <canvas
                ref={canvasRef}
                aria-label="Vista previa de la historia"
                style={{ width: '100%', height: '100%', display: ready && hasDays ? 'block' : 'none' }}
            />
            {(!ready || !hasDays) && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.45
                }}>
                    {loadError
                        ? 'No pudimos cargar las reservas. Cerrá y probá de nuevo.'
                        : !ready
                            ? 'Armando tu agenda...'
                            : options.length === 0
                                ? 'Cargá tus servicios para compartir la agenda.'
                                : 'No quedan horarios libres en esos días. Probá con más días u otro servicio.'}
                </div>
            )}
        </div>
    );

    const optionLabel = option?.kind === 'rental' ? 'Duración' : option?.kind === 'sport' ? 'Cancha y duración' : 'Servicio (define la duración de los huecos)';

    const controls = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <ChipGroup label="Días" choices={DAY_CHOICES} value={dayCount} onChange={setDayCount} />
            {options.length > 1 && options.length <= 4 && (
                <ChipGroup
                    label={optionLabel}
                    choices={options.map(o => ({ value: o.key, label: o.label }))}
                    value={option?.key}
                    onChange={setOptionKey}
                />
            )}
            {options.length > 4 && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>{optionLabel}</span>
                    <select
                        className="agenda-select"
                        value={option?.key || ''}
                        onChange={(e) => setOptionKey(e.target.value)}
                    >
                        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                </label>
            )}
            <ChipGroup label="Horarios por día" choices={MAX_CHOICES} value={maxPerDay} onChange={setMaxPerDay} />
            <ChipGroup
                label="Plantilla"
                choices={STORY_TEMPLATES.map(t => ({ value: t.key, label: t.label }))}
                value={template}
                onChange={setTemplate}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button type="button" className="agenda-btn" onClick={handleDownload} disabled={!ready || !hasDays || busy}>
                    <Download size={16} strokeWidth={2.4} aria-hidden="true" />
                    Descargar
                </button>
                <button type="button" className="agenda-btn main" onClick={handleShare} disabled={!ready || !hasDays || busy}>
                    <Share2 size={16} strokeWidth={2.4} aria-hidden="true" />
                    Compartir
                </button>
            </div>
            {notice && (
                <p role="status" style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '600' }}>{notice}</p>
            )}
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                El link de la imagen es <b style={{ color: 'var(--text-primary)' }}>{link}</b>. En Instagram sumá el sticker de enlace con ese link: el texto de una imagen no se puede tocar.
            </p>
        </div>
    );

    return createPortal(
        <div
            className="agenda-sheet-root"
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
                style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.5)', animation: 'agenda-sheet-fade .2s ease' }}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Compartir agenda abierta"
                style={{
                    ...panelStyle,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    overflowY: 'auto',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-xl)'
                }}
            >
                {phone && (
                    <div style={{ width: '38px', height: '4px', borderRadius: '4px', background: 'var(--border)', margin: '2px auto 0', flexShrink: 0 }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>Compartir agenda abierta</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Una historia con tus horarios libres reales</p>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        className="agenda-close"
                        onClick={onClose}
                        aria-label="Cerrar"
                        style={{
                            width: '32px',
                            height: '32px',
                            flexShrink: 0,
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
                        <X size={16} strokeWidth={2.6} />
                    </button>
                </div>
                {phone ? (
                    <>
                        {preview}
                        {controls}
                    </>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '28px', alignItems: 'start' }}>
                        {controls}
                        {preview}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
