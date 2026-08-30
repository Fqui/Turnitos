import React from 'react';
import AmenityIcon, { parseAmenity } from '../../common/AmenityIcon';

export default function VenueAmenitiesSection({
    amenities,
    showAllAmenities,
    setShowAllAmenities,
    windowWidth,
    cardBg,
    subCardBg,
    textColor,
    borderColor,
    primaryColor,
    getAmenityIcon
}) {
    if (!amenities || amenities.length === 0) return null;

    const limit = windowWidth < 768 ? 6 : 8;
    const displayed = showAllAmenities ? amenities : amenities.slice(0, limit);
    const hasMore = amenities.length > limit;

    return (
        <div style={{
            background: cardBg,
            borderRadius: '24px',
            padding: windowWidth < 768 ? '16px' : '28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: `1px solid ${borderColor}`
        }}>
            <h2 style={{ fontSize: windowWidth < 768 ? '17px' : '20px', fontWeight: '700', color: textColor, marginBottom: windowWidth < 768 ? '14px' : '20px', textAlign: windowWidth < 768 ? 'center' : 'left' }}>
                Comodidades
            </h2>
            <div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: windowWidth < 768 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: windowWidth < 768 ? '8px' : '12px'
                }}>
                    {displayed.map((amenity, idx) => {
                        const parsed = parseAmenity(amenity);
                        const name = parsed.name;
                        const icon = parsed.icon || (getAmenityIcon ? getAmenityIcon(amenity) : 'Sparkles');
                        return (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: windowWidth < 768 ? '8px' : '10px',
                                    padding: windowWidth < 768 ? '8px 10px' : '12px 16px',
                                    background: subCardBg,
                                    borderRadius: '14px',
                                    border: `1px solid ${borderColor}`,
                                    minHeight: windowWidth < 768 ? '48px' : '52px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <div style={{
                                    width: windowWidth < 768 ? '26px' : '30px',
                                    height: windowWidth < 768 ? '26px' : '30px',
                                    borderRadius: '8px',
                                    background: 'rgba(132, 204, 22, 0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: primaryColor,
                                    flexShrink: 0
                                }}>
                                    <AmenityIcon icon={icon} size={windowWidth < 768 ? 15 : 17} />
                                </div>
                                <span style={{
                                    fontSize: windowWidth < 768 ? '11.5px' : '13px',
                                    lineHeight: '1.25',
                                    fontWeight: '600',
                                    color: textColor,
                                    wordBreak: 'break-word',
                                    flex: 1
                                }}>
                                    {name}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {hasMore && (
                    <button
                        type="button"
                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '11px 16px',
                            borderRadius: '14px',
                            border: `1px solid ${borderColor}`,
                            background: subCardBg,
                            color: textColor,
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>
                            {showAllAmenities
                                ? '▲ Mostrar menos'
                                : '▼ Ver todas las comodidades'}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
