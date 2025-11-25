import React from 'react';

export default function ServiceSelector({ services, selected, onSelect, color = '#00E676' }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {services.map(service => {
                const isSelected = selected?.id === service.id;
                return (
                    <div
                        key={service.id}
                        onClick={() => onSelect(service)}
                        style={{
                            position: 'relative',
                            padding: '20px',
                            borderRadius: '16px',
                            border: isSelected ? `2px solid ${color}` : '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected
                                ? `0 4px 16px ${color}30`
                                : '0 2px 8px rgba(0,0,0,0.04)',
                            transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                        }}
                        onMouseEnter={(e) => {
                            if (!isSelected) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSelected) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                            }
                        }}
                    >
                        {/* Selected Badge */}
                        {isSelected && (
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                ✓
                            </div>
                        )}

                        {/* Service Image */}
                        <div style={{
                            height: '140px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '16px',
                            backgroundColor: '#f0f0f0'
                        }}>
                            {service.image || service.image_url ? (
                                <img
                                    src={service.image || service.image_url}
                                    alt={service.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                                    Sin imagen
                                </div>
                            )}
                        </div>

                        {/* Service Name */}
                        <h4 style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            marginBottom: '8px',
                            color: 'var(--text-primary)',
                            lineHeight: '1.3'
                        }}>
                            {service.name}
                        </h4>

                        {/* Service Description */}
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            marginBottom: '16px',
                            lineHeight: '1.5',
                            display: '-webkit-box',
                            WebkitLineClamp: '2',
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {service.description || 'Sin descripción disponible.'}
                        </p>

                        {/* Price and Duration Row */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: '12px',
                            borderTop: '1px solid var(--border)'
                        }}>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '800',
                                color: color
                            }}>
                                ${service.price.toLocaleString()}
                            </div>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: 'var(--bg-main)',
                                padding: '4px 8px',
                                borderRadius: '6px'
                            }}>
                                ⏱ {service.duration} min
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
