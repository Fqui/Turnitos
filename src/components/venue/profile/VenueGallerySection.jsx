import React from 'react';

export default function VenueGallerySection({
    galleryImages,
    onOpenLightbox,
    windowWidth,
    cardBg,
    textColor,
    borderColor,
    primaryColor
}) {
    if (!galleryImages || galleryImages.length === 0) return null;

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
            </div>
            <div style={{
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
                    {galleryImages[0].caption && (
                        <div style={{
                            position: 'absolute',
                            top: '16px',
                            left: '16px',
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(10px)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}>
                            {galleryImages[0].caption}
                        </div>
                    )}
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
                                        {img.caption && !showRemaining && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '8px',
                                                left: '8px',
                                                background: 'rgba(0,0,0,0.6)',
                                                backdropFilter: 'blur(4px)',
                                                color: 'white',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                maxWidth: '90%',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {img.caption}
                                            </div>
                                        )}
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
            </div>
        </div>
    );
}
