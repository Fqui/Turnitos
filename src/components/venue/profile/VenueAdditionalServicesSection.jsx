import React from 'react';
import AmenityIcon from '../../common/AmenityIcon';

export default function VenueAdditionalServicesSection({
    additionalServices,
    showServicesExpanded,
    setShowServicesExpanded,
    windowWidth,
    cardBg,
    subCardBg,
    btnBg,
    textColor,
    secondaryTextColor,
    borderColor,
    primaryColor,
    isDark
}) {
    if (!additionalServices || additionalServices.length === 0) return null;

    return (
        <div style={{
            background: cardBg,
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: `1px solid ${borderColor}`
        }}>
            <div
                onClick={() => setShowServicesExpanded(!showServicesExpanded)}
                style={{
                    padding: windowWidth < 768 ? '16px' : '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                }}
            >
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor }}>
                        Servicios Adicionales
                    </h2>
                    <p style={{ fontSize: '13px', color: secondaryTextColor, fontWeight: '500', marginTop: '4px' }}>
                        Personaliza tu experiencia
                    </p>
                </div>
                <div style={{
                    fontSize: '24px',
                    color: primaryColor,
                    transition: 'transform 0.3s',
                    transform: showServicesExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                    ▼
                </div>
            </div>
            <div style={{
                maxHeight: showServicesExpanded ? '1000px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.4s ease'
            }}>
                <div style={{ padding: windowWidth < 768 ? '0 16px 16px 16px' : '0 32px 32px 32px', display: 'grid', gap: '12px' }}>
                    {additionalServices.map((service, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '14px',
                                padding: '16px',
                                background: subCardBg,
                                borderRadius: '16px',
                                border: `1px solid ${borderColor}`,
                                cursor: 'default',
                                userSelect: 'none'
                            }}
                        >
                            <div style={{
                                width: '46px',
                                height: '46px',
                                background: btnBg,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: primaryColor,
                                flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                            }}>
                                <AmenityIcon icon={service.icon || 'Sparkles'} preferEmoji size={24} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: textColor, lineHeight: '1.3' }}>
                                    {service.name}
                                </div>
                                {service.description && (
                                    <div style={{ fontSize: '13px', color: secondaryTextColor, marginTop: '4px', lineHeight: '1.4' }}>
                                        {service.description}
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '800',
                                        color: primaryColor,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                        padding: '4px 10px',
                                        borderRadius: '8px'
                                    }}>
                                        +${Number(service.price).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
