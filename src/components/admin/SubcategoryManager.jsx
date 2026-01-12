import React, { useState, useEffect } from 'react';
import supabaseService from '../../services/supabaseService';
import { slugify } from '../../utils/businessUtils';

export default function SubcategoryManager({ categoryId, categoryName, onClose }) {
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        icon: ''
    });

    useEffect(() => {
        if (categoryId) {
            fetchSubcategories();
        }
    }, [categoryId]);

    const fetchSubcategories = async () => {
        try {
            const data = await supabaseService.getSubcategories(categoryId);
            setSubcategories(data);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            alert('Error al cargar subcategorías');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const subcategoryData = {
            category_id: categoryId,
            name: formData.name,
            slug: slugify(formData.name),
            icon: formData.icon || null,
            display_order: subcategories.length
        };

        try {
            if (editing) {
                await supabaseService.updateSubcategory(editing.id, subcategoryData);
            } else {
                await supabaseService.createSubcategory(subcategoryData);
            }

            await fetchSubcategories();
            resetForm();
        } catch (error) {
            console.error('Error saving subcategory:', error);
            alert('Error al guardar subcategoría: ' + error.message);
        }
    };

    const handleEdit = (subcategory) => {
        setEditing(subcategory);
        setFormData({
            name: subcategory.name,
            icon: subcategory.icon || ''
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar esta subcategoría?')) return;

        try {
            await supabaseService.deleteSubcategory(id);
            await fetchSubcategories();
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            alert('Error al eliminar subcategoría: ' + error.message);
        }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            name: '',
            icon: ''
        });
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        Subcategorías de {categoryName}
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Gestiona las subcategorías que aparecerán en el filtro
                    </p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        ← Volver
                    </button>
                )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--border)',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    {editing ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Nombre *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Pádel, Fútbol, Barbería..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Icono (Opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            placeholder="🎾"
                            maxLength={2}
                            style={{
                                width: '80px',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '24px',
                                textAlign: 'center'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                        type="submit"
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--primary-paddle)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '14px'
                        }}
                    >
                        {editing ? 'Actualizar' : 'Crear'} Subcategoría
                    </button>
                    {editing && (
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </form>

            {/* Subcategories List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                {subcategories.map(subcategory => (
                    <div key={subcategory.id} style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {subcategory.icon && (
                                <div style={{ fontSize: '24px' }}>
                                    {subcategory.icon}
                                </div>
                            )}
                            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', flex: 1, margin: 0 }}>
                                {subcategory.name}
                            </h4>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => handleEdit(subcategory)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                ✏️ Editar
                            </button>
                            <button
                                onClick={() => handleDelete(subcategory.id)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: '1px solid #FF4444',
                                    backgroundColor: '#FF444410',
                                    color: '#FF4444',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {subcategories.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay subcategorías creadas aún. Crea la primera subcategoría arriba.
                </div>
            )}
        </div>
    );
}
