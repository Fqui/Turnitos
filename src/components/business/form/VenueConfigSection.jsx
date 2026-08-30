import React from 'react';

export default function VenueConfigSection({
    formData,
    setFormData,
    rentalDurationOptions,
    toggleDurationOption,
    venueGalleryImages,
    setVenueGalleryImages,
    handleGalleryUpload,
    uploadingGalleryImage,
    additionalServices,
    setAdditionalServices,
    newAdditionalService,
    setNewAdditionalService,
    addAdditionalService,
    removeAdditionalService,
    includedAmenities,
    newAmenity,
    setNewAmenity,
    addIncludedAmenity,
    removeIncludedAmenity
}) {
    return (
        <>
            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Configuración de Alquiler
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Precio por Hora *
                        </label>
                        <input
                            type="number"
                            value={formData.price_per_hour || ''}
                            onChange={(e) => setFormData({ ...formData, price_per_hour: parseFloat(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                            placeholder="Ej: 5000"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Opciones de Duración (Horas)
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[4, 6, 8, 12, 24].map(hours => (
                                <button
                                    key={hours}
                                    type="button"
                                    onClick={() => toggleDurationOption(hours)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        border: (rentalDurationOptions || []).includes(hours) ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                        backgroundColor: (rentalDurationOptions || []).includes(hours) ? 'var(--primary-paddle)20' : 'transparent',
                                        color: (rentalDurationOptions || []).includes(hours) ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    {hours} hs
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Galería de Imágenes
                </h3>
                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleGalleryUpload}
                        disabled={uploadingGalleryImage}
                        style={{ display: 'none' }}
                        id="gallery-upload"
                    />
                    <label
                        htmlFor="gallery-upload"
                        style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--primary-paddle)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {uploadingGalleryImage ? '⏳ Subiendo...' : '+ Agregar Foto'}
                    </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                    {(venueGalleryImages || []).map((url, index) => (
                        <div key={index} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden' }}>
                            <img src={url} alt={`Gallery ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                                type="button"
                                onClick={() => setVenueGalleryImages(venueGalleryImages.filter((_, i) => i !== index))}
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Servicios Adicionales
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={newAdditionalService.name}
                        onChange={(e) => setNewAdditionalService({ ...newAdditionalService, name: e.target.value })}
                        placeholder="Nombre (ej: DJ, Vajilla)"
                        style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                    <input
                        type="number"
                        value={newAdditionalService.price}
                        onChange={(e) => setNewAdditionalService({ ...newAdditionalService, price: e.target.value })}
                        placeholder="Precio"
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                    <button
                        type="button"
                        onClick={addAdditionalService}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-paddle)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                    >
                        +
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(additionalServices || []).map((service, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{service.name}</span>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--primary-paddle)' }}>${service.price}</span>
                                <button type="button" onClick={() => removeAdditionalService(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4444' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Comodidades Incluidas
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={newAmenity}
                        onChange={(e) => setNewAmenity(e.target.value)}
                        placeholder="Ej: Parrilla, Pileta, Wifi"
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                    <button
                        type="button"
                        onClick={addIncludedAmenity}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-paddle)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                    >
                        +
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(includedAmenities || []).map((amenity, index) => (
                        <span key={index} style={{ padding: '6px 12px', borderRadius: '16px', backgroundColor: 'var(--primary-paddle)20', color: 'var(--primary-paddle)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {amenity}
                            <button type="button" onClick={() => removeIncludedAmenity(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-paddle)', fontWeight: 'bold' }}>×</button>
                        </span>
                    ))}
                </div>
            </section>
        </>
    );
}
