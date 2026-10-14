import React, { useState } from 'react';
import { getProfileChecklist } from '../../../utils/profileChecklist';

/**
 * "Completá tu perfil": what the owner still has to fill in. Required items
 * decide whether the business shows up on Home. Hidden once everything is done.
 */
export default function PortalProfileChecklist({ business, onOpenSettings, isMobile }) {
    const [expanded, setExpanded] = useState(true);
    const items = getProfileChecklist(business);
    if (items.length === 0 || items.every(item => item.done)) return null;

    const doneCount = items.filter(item => item.done).length;
    const missingRequired = items.filter(item => item.required && !item.done);
    const isPublished = missingRequired.length === 0;
    const percent = Math.round((doneCount / items.length) * 100);

    return (
        <div style={{
            marginBottom: '16px',
            padding: isMobile ? '14px' : '16px 18px',
            borderRadius: '14px',
            background: 'var(--bg-card)',
            border: `1px solid ${isPublished ? 'var(--border)' : 'rgba(245, 158, 11, 0.4)'}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                        Completá tu perfil · {doneCount} de {items.length}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {isPublished
                            ? 'Tu negocio ya aparece en TurnitosLR. Completá lo que falta para que se vea mejor.'
                            : 'Tu negocio todavía no aparece en el inicio de TurnitosLR. Completá lo marcado como necesario.'}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                    {expanded ? 'Ocultar' : 'Ver qué falta'}
                </button>
            </div>

            <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border)', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }} />
            </div>

            {expanded && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px', marginTop: '12px' }}>
                    {items.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            disabled={item.done}
                            onClick={() => onOpenSettings?.(item.tab)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: item.done ? 'transparent' : 'var(--bg-main)',
                                color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: item.done ? 'default' : 'pointer',
                                fontFamily: 'inherit'
                            }}
                        >
                            <span aria-hidden="true" style={{ fontSize: '15px' }}>{item.done ? '✅' : '⬜'}</span>
                            <span style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                            {!item.done && item.required && (
                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--status-pending, #b45309)', whiteSpace: 'nowrap' }}>Necesario</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
