import React from 'react';
import ProfileHighlightsBar from '../../profile/ProfileHighlightsBar';

export default function VenueGallerySection({
    galleryImages,
    permanentHighlights = [],
    onSelectHighlight,
    activeStories = [],
    storiesCover,
    onOpenStories,
    onOpenLightbox,
    windowWidth,
    cardBg,
    textColor,
    borderColor,
    primaryColor
}) {
    const hasPhotos = galleryImages && galleryImages.length > 0;
    const hasStories = activeStories.length > 0;
    const hasHighlights = permanentHighlights.length > 0 || hasStories;
    if (!hasPhotos && !hasHighlights) return null;

    // Story cover; a video cover falls back to the logo or the first photo
    const storyCoverRaw = hasStories ? (activeStories[0].cover_image || activeStories[0].images?.[0]) : null;
    const storyCover = storyCoverRaw && !/\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(storyCoverRaw)
        ? storyCoverRaw
        : (storiesCover || galleryImages?.[0]?.url);

    const storiesBubble = hasStories ? (
        <div
            className="highlight-item"
            data-story-origin
            role="button"
            tabIndex={0}
            aria-label="Ver historias (24 h)"
            onClick={onOpenStories}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenStories();
                }
            }}
            style={{
                flexShrink: 0,
                scrollSnapAlign: 'start',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
            }}
        >
            <div data-story-bubble style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                padding: '3px',
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
            }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    padding: '2px',
                    background: 'var(--bg-card)'
                }}>
                    {storyCover && (
                        <img
                            src={storyCover}
                            alt="Historias"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
                        />
                    )}
                </div>
            </div>
            <span style={{
                fontSize: '11.5px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                width: '84px',
                textAlign: 'center',
                lineHeight: '1.25',
                minHeight: '2.5em'
            }}>
                Historias
            </span>
        </div>
    ) : null;

    return (
        <div style={{
            background: cardBg,
            borderRadius: '24px',
            padding: windowWidth < 768 ? '16px' : '32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: `1px solid ${borderColor}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor }}>Galería</h2>
                {hasPhotos && (
                    <button
                        onClick={() => onOpenLightbox(0)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: primaryColor,
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Ver todas →
                    </button>
                )}
            </div>

            {/* Highlights row first, then the photo grid. width 0 + minWidth 100%
                keeps the bubbles from widening the card; they scroll instead */}
            {hasHighlights && (
                <div className="venue-gallery-highlights" style={{ width: 0, minWidth: '100%', marginBottom: hasPhotos ? '16px' : 0 }}>
                    <ProfileHighlightsBar
                        permanentHighlights={permanentHighlights}
                        onSelectHighlight={onSelectHighlight}
                        leading={storiesBubble}
                        noBorder
                    />
                </div>
            )}

            {hasPhotos && <div style={{
                display: 'grid',
                gridTemplateColumns: windowWidth < 768 ? '1fr' : (galleryImages.length > 1 ? '1fr 1fr' : '1fr'),
                gap: '12px'
            }}>
                {/* Main Cover Photo */}
                <div
                    onClick={() => onOpenLightbox(0)}
                    style={{
                        position: 'relative',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        height: windowWidth < 768 ? '240px' : '380px',
                        transition: 'transform 0.3s ease'
                    }}
                >
                    <img
                        src={galleryImages[0].url}
                        alt={galleryImages[0].caption || 'Imagen principal'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {/* Secondary Grid Thumbnails */}
                {galleryImages.length > 1 && (() => {
                    const maxThumbnails = 4;
                    const visibleThumbnails = galleryImages.slice(1, 1 + maxThumbnails);
                    const remainingCount = galleryImages.length - (1 + visibleThumbnails.length);

                    return (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: visibleThumbnails.length === 1 ? '1fr' : '1fr 1fr',
                            gridTemplateRows: visibleThumbnails.length <= 2 ? `repeat(${visibleThumbnails.length}, 1fr)` : '1fr 1fr',
                            gap: '12px',
                            height: windowWidth < 768 ? '240px' : '380px'
                        }}>
                            {visibleThumbnails.map((img, idx) => {
                                const actualIndex = idx + 1;
                                const isLastSlot = idx === visibleThumbnails.length - 1;
                                const showRemaining = isLastSlot && remainingCount > 0;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => onOpenLightbox(actualIndex)}
                                        style={{
                                            position: 'relative',
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'transform 0.3s ease'
                                        }}
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.caption || `Imagen ${actualIndex + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        {showRemaining && (
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'rgba(0,0,0,0.65)',
                                                backdropFilter: 'blur(4px)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                gap: '4px'
                                            }}>
                                                <span style={{ fontSize: '22px', fontWeight: '800' }}>
                                                    +{remainingCount}
                                                </span>
                                                <span style={{ fontSize: '11px', fontWeight: '600', opacity: 0.9 }}>
                                                    más fotos
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>}
        </div>
    );
}
