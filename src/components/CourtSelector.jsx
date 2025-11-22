import React from 'react';

export default function CourtSelector({ selected, onSelect }) {
    const sports = [
        {
            id: 'paddle',
            name: 'Padel',
            image: 'https://images.unsplash.com/photo-1626248596308-25297c2338c3?auto=format&fit=crop&q=80&w=500',
            color: '#00E676'
        },
        {
            id: 'football',
            name: 'Fútbol',
            image: 'https://images.unsplash.com/photo-1579952363873-27f3bde9be2d?auto=format&fit=crop&q=80&w=500',
            color: '#2979FF'
        }
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {sports.map((sport) => {
                const isSelected = selected === sport.id;
                return (
                    <div
                        key={sport.id}
                        onClick={() => onSelect(sport.id)}
                        style={{
                            position: 'relative',
                            height: '120px',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isSelected ? `3px solid ${sport.color}` : '3px solid transparent',
                            transition: 'all 0.3s ease',
                            boxShadow: isSelected ? `0 10px 30px ${sport.color}40` : '0 4px 10px rgba(0,0,0,0.05)',
                            transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                        }}
                    >
                        {/* Background Image */}
                        <img
                            src={sport.image}
                            alt={sport.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: isSelected ? 'brightness(0.8)' : 'brightness(0.6) grayscale(0.5)'
                            }}
                        />

                        {/* Content Overlay */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column'
                        }}>
                            <h3 style={{
                                color: '#fff',
                                fontSize: '20px',
                                fontWeight: '800',
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                letterSpacing: '0.5px'
                            }}>
                                {sport.name}
                            </h3>
                            {isSelected && (
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: sport.color,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: '8px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
