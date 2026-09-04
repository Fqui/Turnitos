import React from 'react';

export default function ProfileSpecialistSelector({
    availableSpecialists,
    selectedSpecialist,
    setSelectedSpecialist,
    loadingSpecialists,
    isMobile
}) {
    return (
        <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
        }}>
            <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--text-primary)'
            }}>
                Especialista
            </h4>

            {loadingSpecialists ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Cargando especialistas disponibles...
                </div>
            ) : availableSpecialists.length === 0 ? (
                <div style={{
                    padding: '12px',
                    background: 'rgba(255, 0, 0, 0.05)',
                    borderRadius: '8px',
                    color: 'var(--error)',
                    fontSize: '14px'
                }}>
                    ⚠️ No hay especialistas disponibles para este horario
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gap: '10px',
                    gridTemplateColumns: isMobile
                        ? '1fr'
                        : availableSpecialists.length <= 3
                            ? `repeat(${availableSpecialists.length + 1}, minmax(0, 1fr))`
                            : 'repeat(auto-fill, minmax(210px, 1fr))'
                }}>
                    {/* "Sin preferencia" Option */}
                    <div
                        onClick={() => setSelectedSpecialist(null)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '12px',
                            border: !selectedSpecialist ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                            background: !selectedSpecialist ? 'color-mix(in srgb, var(--primary-paddle, #7c3aed) 8%, var(--bg-card))' : 'var(--bg-main)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: !selectedSpecialist ? '0 4px 12px color-mix(in srgb, var(--primary-paddle, #7c3aed) 15%, transparent)' : 'none'
                        }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: !selectedSpecialist ? 'color-mix(in srgb, var(--primary-paddle, #7c3aed) 15%, var(--border))' : 'var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            flexShrink: 0
                        }}>
                            👥
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontWeight: '700',
                                fontSize: '14px',
                                color: !selectedSpecialist ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                Sin preferencia
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                Asignación rápida
                            </div>
                        </div>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: !selectedSpecialist ? 'none' : '2px solid var(--border)',
                            background: !selectedSpecialist ? 'var(--primary-paddle)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}>
                            {!selectedSpecialist && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Available Specialists list */}
                    {availableSpecialists.map(specialist => {
                        const isSelected = selectedSpecialist?.id === specialist.id;
                        const avatarUrl = specialist.avatar_url || specialist.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(specialist.name)}&background=random&size=100`;
                        return (
                            <div
                                key={specialist.id}
                                onClick={() => setSelectedSpecialist(specialist)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                    background: isSelected ? 'color-mix(in srgb, var(--primary-paddle, #7c3aed) 8%, var(--bg-card))' : 'var(--bg-main)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isSelected ? '0 4px 12px color-mix(in srgb, var(--primary-paddle, #7c3aed) 15%, transparent)' : 'none'
                                }}
                            >
                                <img
                                    src={avatarUrl}
                                    alt={specialist.name}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid var(--bg-card)',
                                        flexShrink: 0
                                    }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {specialist.name}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {specialist.role || 'Especialista'}
                                    </div>
                                </div>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: isSelected ? 'none' : '2px solid var(--border)',
                                    background: isSelected ? 'var(--primary-paddle)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}>
                                    {isSelected && (
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
