import React from 'react';
import { Check } from 'lucide-react';

function SportCard({ group, isSelected, onSelect, isMobile }) {
    const count = group.courts.length;
    return (
        <button
            type="button"
            onClick={() => onSelect(group.key)}
            aria-pressed={isSelected}
            style={{
                position: 'relative',
                flex: 1,
                minWidth: 0,
                height: isMobile ? '132px' : '150px',
                padding: 0,
                borderRadius: '18px',
                overflow: 'hidden',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                background: '#1f2937',
                boxShadow: isSelected
                    ? '0 0 0 3px var(--primary, #3ECF8E), 0 10px 24px rgba(0,0,0,0.18)'
                    : '0 4px 14px rgba(0,0,0,0.08)',
                transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                transform: isSelected ? 'translateY(-1px)' : 'none'
            }}
        >
            {group.image && (
                <img
                    src={group.image}
                    alt=""
                    loading="lazy"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: isSelected ? 'none' : 'saturate(.55) brightness(.85)',
                        transition: 'filter 0.25s ease'
                    }}
                />
            )}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 75%)'
            }} />

            {isSelected && (
                <span style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--primary, #3ECF8E)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}>
                    <Check size={16} strokeWidth={3} />
                </span>
            )}

            <div style={{
                position: 'absolute',
                left: isMobile ? '12px' : '16px',
                right: isMobile ? '12px' : '16px',
                bottom: isMobile ? '12px' : '14px',
                color: '#fff'
            }}>
                <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 800, lineHeight: 1.15 }}>
                    {group.label}
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9 }}>
                        {count} {count === 1 ? 'cancha' : 'canchas'}
                    </span>
                    {group.minPrice !== null && (
                        <span style={{
                            background: '#fff',
                            color: '#111827',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap'
                        }}>
                            desde ${group.minPrice.toLocaleString('es-AR')}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

export default function ProfileSportSelector({ groups, selectedSport, onSelect, isMobile }) {
    return (
        <section style={{ marginBottom: '30px', animation: 'slideUp 0.4s ease' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                ¿Qué querés jugar?
            </h3>
            <div style={{ display: 'flex', gap: isMobile ? '10px' : '16px' }}>
                {groups.map(group => (
                    <SportCard
                        key={group.key}
                        group={group}
                        isSelected={group.key === selectedSport}
                        onSelect={onSelect}
                        isMobile={isMobile}
                    />
                ))}
            </div>
        </section>
    );
}
