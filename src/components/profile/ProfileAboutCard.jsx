import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const getPublicSpecialists = (business) =>
    (business?.specialists || []).filter(s => s && s.id !== 'auto-assigned' && s.name);

const AUTOPLAY_MS = 4500;

const getInitials = (name = '') =>
    name
        .replace(/^(lic|dr|dra|prof)\.?\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');

function SpecialistAvatar({ specialist, size, primaryColor }) {
    const style = {
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        objectFit: 'cover',
        border: '3px solid var(--bg-card)',
        boxShadow: `0 0 0 2px color-mix(in srgb, ${primaryColor} 35%, transparent), 0 4px 10px rgba(15, 23, 42, 0.10)`,
        background: `color-mix(in srgb, ${primaryColor} 12%, transparent)`,
        color: primaryColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.round(size * 0.34)
    };
    if (specialist.avatar_url) {
        return <img src={specialist.avatar_url} alt={specialist.name} loading="lazy" draggable={false} style={style} />;
    }
    return <div style={style} aria-hidden="true">{getInitials(specialist.name)}</div>;
}

function SpecialistSlide({ specialist, primaryColor }) {
    return (
        <div className="profile-about-slide">
            <SpecialistAvatar specialist={specialist} size={68} primaryColor={primaryColor} />
            <div style={{ minWidth: 0 }}>
                <div className="profile-about-name">{specialist.name}</div>
                {specialist.role && (
                    <div className="profile-about-role" style={{ color: primaryColor }}>{specialist.role}</div>
                )}
            </div>
        </div>
    );
}

export default function ProfileAboutCard({ business, primaryColor = '#10b981' }) {
    const specialists = getPublicSpecialists(business);
    const trackRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const isCarousel = specialists.length > 1;

    const goTo = (index) => {
        const track = trackRef.current;
        if (!track) return;
        const total = specialists.length;
        const next = (index + total) % total;
        track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    };

    // Keep the active dot in sync with manual swipes
    const handleScroll = () => {
        const track = trackRef.current;
        if (!track || !track.clientWidth) return;
        setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
    };

    // Autoplay, paused while the user interacts with the card
    useEffect(() => {
        if (!isCarousel || isPaused) return undefined;
        const timer = setInterval(() => goTo(activeIndex + 1), AUTOPLAY_MS);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCarousel, isPaused, activeIndex, specialists.length]);

    if (specialists.length === 0) return null;

    return (
        <section
            className="profile-about-card"
            id="nosotros"
            aria-label="Nosotros"
            aria-roledescription={isCarousel ? 'carrusel' : undefined}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            style={{ '--about-accent': primaryColor }}
        >
            <div className="profile-about-header">
                <span className="profile-about-title">Nosotros</span>
                {isCarousel && (
                    <div className="profile-about-controls">
                        <button type="button" className="profile-about-arrow" onClick={() => goTo(activeIndex - 1)} aria-label="Profesional anterior">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="profile-about-counter">{activeIndex + 1}/{specialists.length}</span>
                        <button type="button" className="profile-about-arrow" onClick={() => goTo(activeIndex + 1)} aria-label="Profesional siguiente">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {isCarousel ? (
                <>
                    <div ref={trackRef} className="profile-about-track no-scrollbar" onScroll={handleScroll}>
                        {specialists.map(s => (
                            <SpecialistSlide key={s.id} specialist={s} primaryColor={primaryColor} />
                        ))}
                    </div>
                    <div className="profile-about-dots" role="tablist">
                        {specialists.map((s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                role="tab"
                                aria-selected={i === activeIndex}
                                aria-label={`Ver a ${s.name}`}
                                className={`profile-about-dot${i === activeIndex ? ' is-active' : ''}`}
                                onClick={() => goTo(i)}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <SpecialistSlide specialist={specialists[0]} primaryColor={primaryColor} />
            )}
        </section>
    );
}
