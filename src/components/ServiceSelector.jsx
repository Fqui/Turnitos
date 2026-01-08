import React, { useState, useEffect } from 'react';

export default function ServiceSelector({ services, selected, onSelect, color = '#00E676' }) {
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [categories, setCategories] = useState(['Todos']);

    useEffect(() => {
        if (services) {
            const uniqueCategories = ['Todos', ...new Set(services.map(s => s.category).filter(Boolean))];
            setCategories(uniqueCategories);
        }
    }, [services]);

    const filteredServices = activeCategory === 'Todos'
        ? services
        : services.filter(s => s.category === activeCategory);

    return (
        <div>
            {/* Category Tabs */}
            {categories.length > 2 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '20px'
                }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                backgroundColor: activeCategory === cat ? color : 'var(--bg-card)',
                                color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                boxShadow: activeCategory === cat ? `0 4px 12px ${color}40` : 'none',
                                border: activeCategory === cat ? 'none' : '1px solid var(--border)'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Services Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredServices.map(service => {
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

                            {/* Category Badge */}
                            {service.category && (
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-main)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    zIndex: 2
                                }}>
                                    {service.category}
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
        </div>
    );
}
