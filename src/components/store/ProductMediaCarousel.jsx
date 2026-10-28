import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from 'lucide-react';
import FramedImage from '../common/FramedImage';

const canHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

// Product video: first slide, muted, looping, plays only while visible
function VideoSlide({ src, poster, active }) {
    const ref = useRef(null);
    const [muted, setMuted] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (active) el.play().catch(() => {});
        else el.pause();
    }, [active]);

    const slideStyle = { position: 'relative', flex: '0 0 100%', height: '100%', scrollSnapAlign: 'center', scrollSnapStop: 'always', background: '#000' };

    if (failed) {
        return (
            <div style={slideStyle}>
                {poster && <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={24} color="#fff" fill="#fff" />
                    </span>
                </span>
            </div>
        );
    }

    return (
        <div style={slideStyle}>
            <video
                ref={ref}
                src={src}
                poster={poster}
                autoPlay
                muted={muted}
                loop
                playsInline
                preload="metadata"
                onError={() => setFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
                type="button"
                onClick={() => setMuted(m => !m)}
                aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                style={{
                    position: 'absolute', top: '12px', right: '12px', height: '32px', padding: '0 10px', borderRadius: '16px', border: 'none',
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', zIndex: 3
                }}
            >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                {muted ? 'Sin sonido' : 'Con sonido'}
            </button>
        </div>
    );
}

/**
 * Square product gallery: swipe on phones, arrows on desktop, dots always.
 * The video (if any) goes first. `children` is drawn on top (e.g. the stock pill).
 */
export default function ProductMediaCarousel({ photos, video, alt, color = '#10B981', children }) {
    const trackRef = useRef(null);
    const [index, setIndex] = useState(0);
    const slides = [
        ...(video ? [{ type: 'video', key: `video:${video}` }] : []),
        ...photos.map(src => ({ type: 'image', key: src, src }))
    ];

    const goTo = (i) => {
        const track = trackRef.current;
        if (!track) return;
        const next = (i + slides.length) % slides.length;
        track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    };

    const handleScroll = () => {
        const track = trackRef.current;
        if (!track || !track.clientWidth) return;
        const current = Math.round(track.scrollLeft / track.clientWidth);
        if (current !== index) setIndex(current);
    };

    const arrowStyle = (side) => ({
        position: 'absolute', top: '50%', [side]: '12px', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%',
        border: 'none', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3
    });

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
            <div
                ref={trackRef}
                onScroll={handleScroll}
                className="product-media-track"
                style={{
                    display: 'flex', width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain'
                }}
            >
                {slides.map((slide, i) => (slide.type === 'video'
                    ? <VideoSlide key={slide.key} src={video} poster={photos[0]} active={index === i} />
                    : (
                        <div key={slide.key} style={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'center', scrollSnapStop: 'always' }}>
                            <FramedImage
                                src={slide.src}
                                alt={`${alt} · foto ${i + 1 - (video ? 1 : 0)}`}
                                draggable={false}
                                loading={i < 2 ? 'eager' : 'lazy'}
                            />
                        </div>
                    )))}
            </div>
            <style>{'.product-media-track::-webkit-scrollbar{display:none}'}</style>

            {children}

            {canHover && slides.length > 1 && (
                <>
                    <button type="button" aria-label="Anterior" onClick={() => goTo(index - 1)} style={arrowStyle('left')}><ChevronLeft size={20} /></button>
                    <button type="button" aria-label="Siguiente" onClick={() => goTo(index + 1)} style={arrowStyle('right')}><ChevronRight size={20} /></button>
                </>
            )}

            {slides.length > 1 && (
                <div style={{
                    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', alignItems: 'center',
                    padding: '5px 8px', borderRadius: '12px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 3
                }}>
                    {slides.map((slide, i) => (
                        <button
                            key={slide.key}
                            type="button"
                            aria-label={slide.type === 'video' ? 'Ver video' : `Ver foto ${i + 1 - (video ? 1 : 0)}`}
                            onClick={() => goTo(i)}
                            style={{
                                width: i === index ? '18px' : '7px', height: '7px', borderRadius: '4px', border: 'none', padding: 0,
                                background: i === index ? color : 'rgba(255,255,255,0.75)', cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
