import React from 'react';

export default function CourtsSection({
    formData,
    newCourt,
    setNewCourt,
    addCourt,
    removeCourt
}) {
    return (
        <section>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Canchas
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                    type="text"
                    value={newCourt.name}
                    onChange={(e) => setNewCourt({ ...newCourt, name: e.target.value })}
                    style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Nombre de la cancha"
                />
                <input
                    type="number"
                    value={newCourt.price}
                    onChange={(e) => setNewCourt({ ...newCourt, price: e.target.value })}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Precio"
                />
                <button
                    type="button"
                    onClick={addCourt}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: 'var(--primary-paddle)',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    + Agregar
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(formData.courts || []).map((court, index) => (
                    <div
                        key={court.id || index}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{court.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: 'var(--primary-paddle)', fontWeight: '700' }}>${court.price}</span>
                            <button
                                type="button"
                                onClick={() => removeCourt(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#FF4444',
                                    cursor: 'pointer',
                                    fontSize: '18px'
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
