import React, { useState, useEffect } from 'react';
import supabaseService from '../../services/supabaseService';
import { slugify } from '../../utils/businessUtils';

const BUSINESS_TYPES = [
    { value: 'sport', label: 'Deportes', icon: '⚽' },
    { value: 'service', label: 'Servicios', icon: '💼' },
    { value: 'alquiler', label: 'Alquileres', icon: '🏡' }
];

const SUGGESTED_COLORS = [
    '#00E676', // Green
    '#2196F3', // Blue
    '#9C27B0', // Purple
    '#FF9800', // Orange
    '#E91E63', // Pink
    '#00BCD4', // Cyan
    '#FF5722', // Deep Orange
    '#795548'  // Brown
];

export default function CategoryManager({ onClose, onManageSubcategories }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        icon: '📁',
        color: '#00E676',
        business_type: 'sport'
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await supabaseService.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            alert('Error al cargar categorías');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const categoryData = {
            ...formData,
            slug: slugify(formData.name),
            display_order: categories.length
        };

        try {
            if (editing) {
                await supabaseService.updateCategory(editing.id, categoryData);
            } else {
                await supabaseService.createCategory(categoryData);
            }

            await fetchCategories();
            resetForm();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Error al guardar categoría: ' + error.message);
        }
    };

    const handleEdit = (category) => {
        setEditing(category);
        setFormData({
            name: category.name,
            icon: category.icon,
            color: category.color,
            business_type: category.business_type
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar esta categoría? Esto también eliminará todas sus subcategorías.')) return;

        try {
            await supabaseService.deleteCategory(id);
            await fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Error al eliminar categoría: ' + error.message);
        }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            name: '',
            icon: '📁',
            color: '#00E676',
            business_type: 'sport'
        });
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    Gestionar Categorías
                </h2>
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
                        ✕ Cerrar
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
                    {editing ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Nombre *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Deportes"
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
                            Icono (Emoji) *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            placeholder="⚽"
                            maxLength={2}
                            style={{
                                width: '100%',
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Tipo de Negocio *
                        </label>
                        <select
                            required
                            value={formData.business_type}
                            onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        >
                            {BUSINESS_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Color *
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                style={{
                                    width: '60px',
                                    height: '44px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
                                {SUGGESTED_COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color })}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: color,
                                            border: formData.color === color ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
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
                        {editing ? 'Actualizar' : 'Crear'} Categoría
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

            {/* Categories List */}
            <div style={{ display: 'grid', gap: '12px' }}>
                {categories.map(category => (
                    <div key={category.id} style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: category.color + '20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            {category.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                {category.name}
                            </h4>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <span>{BUSINESS_TYPES.find(t => t.value === category.business_type)?.label}</span>
                                <span>•</span>
                                <span>{category.subcategories?.length || 0} subcategorías</span>
                                <span>•</span>
                                <span style={{ color: category.color, fontWeight: '600' }}>{category.color}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => onManageSubcategories && onManageSubcategories(category)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--primary-paddle)',
                                    backgroundColor: 'var(--primary-paddle)20',
                                    color: 'var(--primary-paddle)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                📂 Subcategorías
                            </button>
                            <button
                                onClick={() => handleEdit(category)}
                                style={{
                                    padding: '8px 16px',
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
                                onClick={() => handleDelete(category.id)}
                                style={{
                                    padding: '8px 16px',
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

            {categories.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No hay categorías creadas aún. Crea la primera categoría arriba.
                </div>
            )}
        </div>
    );
}
