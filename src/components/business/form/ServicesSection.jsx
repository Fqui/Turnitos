import React from 'react';

export default function ServicesSection({
    formData,
    serviceCategories,
    setServiceCategories,
    newCategory,
    setNewCategory,
    newService,
    setNewService,
    editingServiceIndex,
    addService,
    editService,
    removeService,
    cancelEditService,
    handleServiceImageUpload,
    uploadingServiceImage
}) {
    return (
        <section>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Servicios
            </h3>

            {/* Category Management Section */}
            <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: 'var(--bg-main)',
                borderRadius: '12px',
                border: '1px solid var(--border)'
            }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    📁 Categorías de Servicios
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Crea categorías para organizar tus servicios (ej: "Cortes", "Coloración", "Tratamientos")
                </p>

                {/* Add Category */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newCategory.trim() && !serviceCategories.includes(newCategory.trim())) {
                                    setServiceCategories([...serviceCategories, newCategory.trim()]);
                                    setNewCategory('');
                                }
                            }
                        }}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}
                        placeholder="Nueva categoría..."
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (newCategory.trim() && !serviceCategories.includes(newCategory.trim())) {
                                setServiceCategories([...serviceCategories, newCategory.trim()]);
                                setNewCategory('');
                            }
                        }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'var(--primary-paddle)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '14px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        + Agregar
                    </button>
                </div>

                {/* Category List */}
                {serviceCategories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {serviceCategories.map((cat, index) => (
                            <span
                                key={index}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    backgroundColor: 'var(--primary-paddle)20',
                                    color: 'var(--primary-paddle)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {cat}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const isInUse = formData.services.some(s => s.category === cat);
                                        if (isInUse) {
                                            alert(`No puedes eliminar "${cat}" porque hay servicios asignados a esta categoría`);
                                        } else if (window.confirm(`¿Eliminar categoría "${cat}"?`)) {
                                            setServiceCategories(serviceCategories.filter((_, i) => i !== index));
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary-paddle)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        padding: '0',
                                        lineHeight: '1',
                                        fontWeight: '700'
                                    }}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '12px' }}>
                <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Nombre del servicio"
                />
                <input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                    style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Precio"
                />
                <input
                    type="text"
                    value={newService.duration}
                    onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                    style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px'
                    }}
                    placeholder="Duración"
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                    {editingServiceIndex !== null && (
                        <button
                            type="button"
                            onClick={cancelEditService}
                            style={{
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={addService}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'var(--primary-paddle)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {editingServiceIndex !== null ? 'Actualizar' : '+ Agregar'}
                    </button>
                </div>
            </div>
            <input
                type="text"
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    marginBottom: '12px'
                }}
                placeholder="Descripción del servicio"
            />

            {/* Category Dropdown */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Categoría *
                </label>
                {serviceCategories.length === 0 ? (
                    <div style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ffc107',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        fontSize: '13px'
                    }}>
                        Primero crea una categoría arriba
                    </div>
                ) : (
                    <select
                        value={newService.category}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="">Seleccionar categoría...</option>
                        {serviceCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Service Image Upload */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Imagen del Servicio (Opcional)
                </label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleServiceImageUpload}
                    disabled={uploadingServiceImage}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                    }}
                />
                {uploadingServiceImage && (
                    <span style={{ fontSize: '12px', color: 'var(--primary-paddle)', marginTop: '4px', display: 'block' }}>
                        ⏳ Subiendo imagen...
                    </span>
                )}
                {newService.image_url && (
                    <div style={{
                        marginTop: '8px',
                        width: '100%',
                        height: '100px',
                        borderRadius: '8px',
                        border: '2px dashed var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: 'var(--bg-main)',
                        position: 'relative'
                    }}>
                        <img
                            src={newService.image_url}
                            alt="Preview"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                        <button
                            type="button"
                            onClick={() => setNewService({ ...newService, image_url: '' })}
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
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formData.services.map((service, index) => (
                    <div
                        key={service.id || index}
                        style={{
                            padding: '16px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <h4 style={{ fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{service.name}</h4>
                                    {service.category && (
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: 'var(--primary-paddle)20',
                                            color: 'var(--primary-paddle)',
                                            fontWeight: '600'
                                        }}>
                                            {service.category}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{service.description}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => editService(index)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '18px'
                                    }}
                                    title="Editar"
                                >
                                    ✏️
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
                                            removeService(index);
                                        }
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#FF4444',
                                        cursor: 'pointer',
                                        fontSize: '18px'
                                    }}
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                            <span style={{ color: 'var(--primary-paddle)', fontWeight: '700' }}>${service.price}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>⏱ {service.duration}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
