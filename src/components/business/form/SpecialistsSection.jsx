import React from 'react';

export default function SpecialistsSection({
    formData,
    newSpecialist,
    setNewSpecialist,
    addSpecialist,
    removeSpecialist,
    handleSpecialistImageUpload,
    uploadingSpecialistImage
}) {
    return (
        <section>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Profesionales
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <input
                    type="text"
                    value={newSpecialist.name || ''}
                    onChange={(e) => setNewSpecialist({ ...newSpecialist, name: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Nombre del profesional"
                />
                <input
                    type="text"
                    value={newSpecialist.role || ''}
                    onChange={(e) => setNewSpecialist({ ...newSpecialist, role: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Especialidad/Rol (ej: Peluquero, Masajista)"
                />

                {/* Specialist Image Upload */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                        Foto de Perfil (Opcional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleSpecialistImageUpload}
                        disabled={uploadingSpecialistImage}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                    />
                    {uploadingSpecialistImage && (
                        <span style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '4px', display: 'block' }}>
                            ⏳ Subiendo imagen...
                        </span>
                    )}
                    {newSpecialist.image_url && (
                        <div style={{
                            marginTop: '8px',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: '2px dashed var(--border)',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <img
                                src={newSpecialist.image_url}
                                alt="Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <button
                                type="button"
                                onClick={() => setNewSpecialist({ ...newSpecialist, image_url: '' })}
                                style={{
                                    position: 'absolute',
                                    top: '0',
                                    right: '0',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    border: 'none',
                                    width: '100%',
                                    height: '100%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                {/* Bio - Only show if it's the first specialist being added (or list is empty) */}
                {(!formData.specialists || formData.specialists.length === 0) && (
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                            Biografía (Solo visible si es el único profesional)
                        </label>
                        <textarea
                            value={newSpecialist.bio || ''}
                            onChange={(e) => setNewSpecialist({ ...newSpecialist, bio: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                minHeight: '80px',
                                resize: 'vertical'
                            }}
                            placeholder="Descripción o biografía del profesional..."
                        />
                    </div>
                )}

                <button
                    type="button"
                    onClick={addSpecialist}
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
                    + Agregar Profesional
                </button>
            </div>

            {/* List of Specialists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formData.specialists && formData.specialists.map((specialist, index) => (
                    <div
                        key={specialist.id || index}
                        style={{
                            padding: '16px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <h4 style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{specialist.name}</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{specialist.role}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeSpecialist(index)}
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
                ))}
            </div>
        </section>
    );
}
