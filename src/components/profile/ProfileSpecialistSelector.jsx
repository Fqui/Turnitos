import React from 'react';
import { Users, Check, AlertCircle } from 'lucide-react';
import SpecialistAvatar from './SpecialistAvatar';

function OptionCard({ isSelected, onClick, avatar, title, subtitle }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSelected}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: isSelected ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                // Keep the same outer size whether selected (2px border) or not (1px)
                margin: isSelected ? 0 : '1px',
                background: isSelected
                    ? 'color-mix(in srgb, var(--primary-paddle, #7c3aed) 10%, var(--bg-card))'
                    : 'var(--bg-main)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'background 0.2s ease, border-color 0.2s ease'
            }}
        >
            {avatar}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 700,
                    fontSize: '14px',
                    color: isSelected ? 'var(--primary-paddle)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {subtitle}
                </div>
            </div>
            <span style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: isSelected ? 'none' : '2px solid var(--border)',
                background: isSelected ? 'var(--primary-paddle)' : 'transparent',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                {isSelected && <Check size={13} strokeWidth={3} />}
            </span>
        </button>
    );
}

export default function ProfileSpecialistSelector({
    availableSpecialists,
    selectedSpecialist,
    setSelectedSpecialist,
    loadingSpecialists,
    isMobile
}) {
    return (
        <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border)'
        }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                ¿Con quién?
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Estos profesionales están libres en ese horario.
            </p>

            {loadingSpecialists ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Buscando profesionales libres...
                </div>
            ) : availableSpecialists.length === 0 ? (
                <div role="alert" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'color-mix(in srgb, var(--error, #ef4444) 10%, var(--bg-card))',
                    border: '1px solid color-mix(in srgb, var(--error, #ef4444) 35%, transparent)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                }}>
                    <AlertCircle size={18} style={{ color: 'var(--error, #ef4444)', flexShrink: 0 }} />
                    No hay profesionales libres en ese horario. Elegí otro horario.
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gap: '10px',
                    gridTemplateColumns: isMobile
                        ? '1fr'
                        : 'repeat(auto-fill, minmax(230px, 1fr))'
                }}>
                    <OptionCard
                        isSelected={!selectedSpecialist}
                        onClick={() => setSelectedSpecialist(null)}
                        title="Sin preferencia"
                        subtitle="El primero que esté libre"
                        avatar={(
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: 'color-mix(in srgb, var(--primary-paddle, #7c3aed) 18%, var(--bg-card))',
                                color: 'var(--primary-paddle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Users size={20} />
                            </div>
                        )}
                    />

                    {availableSpecialists.map(specialist => (
                        <OptionCard
                            key={specialist.id}
                            isSelected={selectedSpecialist?.id === specialist.id}
                            onClick={() => setSelectedSpecialist(specialist)}
                            title={specialist.name}
                            subtitle={specialist.role || 'Especialista'}
                            avatar={<SpecialistAvatar specialist={specialist} size={44} />}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
