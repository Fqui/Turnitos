import React from 'react';
import AmenityIcon from '../common/AmenityIcon';

export default function ProfileVenuePricingSection({
    business,
    primaryColor
}) {
    return (
        <>
            {/* Pricing Card */}
            <section style={{ marginBottom: '30px' }}>
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    padding: '24px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    border: '1px solid var(--border)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                        💰 Precio por Hora
                    </div>
                    <div style={{
                        fontSize: '48px',
                        fontWeight: '900',
                        color: primaryColor,
                        marginBottom: '8px',
                        lineHeight: '1'
                    }}>
                        ${business.price_per_hour || 0}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        El precio final dependerá de la duración del alquiler
                    </div>
                </div>
            </section>

            {/* Included Amenities */}
            {business.included_amenities && business.included_amenities.length > 0 && (
                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        ✨ Incluido en el Alquiler
                    </h3>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        padding: '20px',
                        borderRadius: '20px',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {business.included_amenities.map((amenity, index) => (
                                <span key={index} style={{
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    backgroundColor: `${primaryColor}15`,
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span style={{ color: primaryColor }}>✓</span>
                                    {amenity}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Additional Services */}
            {business.additional_services && business.additional_services.length > 0 && (
                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                        🎯 Servicios Adicionales Disponibles
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {business.additional_services.map((service, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.backgroundColor = `${primaryColor}05`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'rgba(132, 204, 22, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: primaryColor,
                                        flexShrink: 0
                                    }}>
                                        <AmenityIcon icon={service.icon || 'Sparkles'} preferEmoji size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '15px' }}>
                                            {service.name}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    color: primaryColor
                                }}>
                                    +${service.price}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: `${primaryColor}10`,
                        borderRadius: '12px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        textAlign: 'center'
                    }}>
                        💡 Podrás seleccionar estos servicios al momento de reservar
                    </div>
                </section>
            )}
        </>
    );
}
