import React from 'react';

export default function ProfileHighlightsBar({
    permanentHighlights,
    onSelectHighlight,
    noBorder = false
}) {
    if (!permanentHighlights || permanentHighlights.length === 0) {
        if (noBorder) return null;
        return (
            <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: 'var(--border)',
                marginTop: '20px'
            }} />
        );
    }

    return (
        <div
            className="instagram-stories-bar"
            id="galeria"
            style={noBorder ? { marginTop: 0, paddingTop: 0, borderTop: 'none' } : {}}
        >
            <div className="highlights-container">
                {permanentHighlights.map((highlight, index) => (
                    <div
                        key={highlight.id || index}
                        className="highlight-item"
                        onClick={() => onSelectHighlight(index)}
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
                        <div style={{
                            width: '84px',
                            height: '84px',
                            borderRadius: '50%',
                            padding: '2px',
                            background: 'var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                padding: '2px',
                                background: 'var(--bg-card)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center'
                            }}>
                                {/\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(highlight.cover_image || highlight.images[0]) ? (
                                    <video
                                        src={highlight.cover_image || highlight.images[0]}
                                        muted
                                        playsInline
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '50%'
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={highlight.cover_image || highlight.images[0]}
                                        alt={highlight.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '50%'
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        <span style={{
                            fontSize: '11.5px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            width: '84px',
                            maxWidth: '84px',
                            textAlign: 'center',
                            lineHeight: '1.25',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-word',
                            minHeight: '2.5em'
                        }}>
                            {highlight.title}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
