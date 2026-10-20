import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const canHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

// Swipeable photo strip (native scroll-snap); arrows on desktop, dots always.
export default function ServicePhotoCarousel({ images, alt, color = '#00E676' }) {
    const trackRef = useRef(null);
    const [index, setIndex] = useState(0);

    const goTo = (i) => {
        const track = trackRef.current;
        if (!track) return;
        const next = (i + images.length) % images.length;
        track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    };

    const handleScroll = () => {
        const track = trackRef.current;
        if (!track || !track.clientWidth) return;
        const current = Math.round(track.scrollLeft / track.clientWidth);
        if (current !== index) setIndex(current);
    };

    const arrowStyle = (side) => ({
        position: 'absolute',
        top: '50%',
        [side]: '12px',
        transform: 'translateY(-50%)',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 3
    });

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div
                ref={trackRef}
                onScroll={handleScroll}
                className="service-photo-track"
                style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehaviorX: 'contain'
                }}
            >
                {images.map((url, i) => (
                    <img
                        key={url}
                        src={url}
                        alt={`${alt} · foto ${i + 1}`}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        draggable={false}
                        style={{
                            flex: '0 0 100%',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            scrollSnapAlign: 'center',
                            scrollSnapStop: 'always'
                        }}
                    />
                ))}
            </div>
            <style>{'.service-photo-track::-webkit-scrollbar{display:none}'}</style>

            {canHover && (
                <>
                    <button type="button" aria-label="Foto anterior" onClick={() => goTo(index - 1)} style={arrowStyle('left')}>
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" aria-label="Foto siguiente" onClick={() => goTo(index + 1)} style={arrowStyle('right')}>
                        <ChevronRight size={20} />
                    </button>
                </>
            )}

            <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '6px',
                padding: '5px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(4px)',
                zIndex: 3
            }}>
                {images.map((url, i) => (
                    <button
                        key={url}
                        type="button"
                        aria-label={`Ver foto ${i + 1}`}
                        onClick={() => goTo(i)}
                        style={{
                            width: i === index ? '18px' : '7px',
                            height: '7px',
                            borderRadius: '4px',
                            border: 'none',
                            padding: 0,
                            backgroundColor: i === index ? color : 'rgba(255, 255, 255, 0.75)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
