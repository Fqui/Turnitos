import React, { useState } from 'react';
import supabaseService from '../../../services/supabaseService';
import { useNotification } from '../../../contexts/NotificationContext';

function SimpleModal({ title, children, onClose }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'var(--sa-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(8px)',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--sa-surface)',
                    borderRadius: '16px',
                    padding: '26px',
                    maxWidth: '480px',
                    width: '100%',
                    border: '1px solid var(--sa-border-strong)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--sa-text)' }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--sa-text-muted)',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px'
                        }}
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function CategoriesTab({
    categories = [],
    subcategories = [],
    onDeleteCategory,
    onDeleteSubcategory,
    onReload
}) {
    const { showToast } = useNotification();
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', icon: '', description: '' });
    const [subcategoryForm, setSubcategoryForm] = useState({ name: '', description: '', category_id: '' });

    const handleSaveCategory = async () => {
        try {
            if (editingCategory) {
                await supabaseService.updateCategory(editingCategory.id, categoryForm);
                showToast('Categoría actualizada con éxito', 'success');
            } else {
                await supabaseService.createCategory(categoryForm);
                showToast('Categoría creada con éxito', 'success');
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryForm({ name: '', icon: '', description: '' });
            if (onReload) onReload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleSaveSubcategory = async () => {
        try {
            if (editingSubcategory) {
                await supabaseService.updateSubcategory(editingSubcategory.id, subcategoryForm);
                showToast('Subcategoría actualizada con éxito', 'success');
            } else {
                await supabaseService.createSubcategory(subcategoryForm);
                showToast('Subcategoría creada con éxito', 'success');
            }
            setShowSubcategoryModal(false);
            setEditingSubcategory(null);
            setSubcategoryForm({ name: '', description: '', category_id: '' });
            if (onReload) onReload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // Grouped by parent category, then by display order
    const categoryName = (sub) => categories.find(c => c.id === sub.category_id)?.name || '';
    const sortedSubcategories = [...subcategories].sort((a, b) =>
        categoryName(a).localeCompare(categoryName(b), 'es')
        || (a.display_order || 0) - (b.display_order || 0)
        || (a.name || '').localeCompare(b.name || '', 'es')
    );

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
        }}>
            {/* Categories Section */}
            <div style={{
                background: 'linear-gradient(145deg, var(--sa-surface), var(--sa-surface))',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--sa-border)',
                boxShadow: '0 4px 25px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--sa-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📁</span> Categorías Principales ({categories.length})
                    </h3>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setCategoryForm({ name: '', icon: '', description: '' });
                            setShowCategoryModal(true);
                        }}
                        style={{
                            padding: '7px 14px',
                            background: 'linear-gradient(135deg, var(--sa-primary), var(--sa-primary))',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        + Nueva
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {categories.map((cat) => (
                        <div key={cat.id} style={{
                            padding: '12px 14px',
                            background: 'var(--sa-surface)',
                            borderRadius: '10px',
                            border: '1px solid var(--sa-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                background: 'var(--sa-surface-2)',
                                border: '1px solid var(--sa-border-strong)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {cat.icon || '📁'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--sa-text)' }}>
                                    {cat.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--sa-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cat.description || 'Sin descripción'}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingCategory(cat);
                                    setCategoryForm({ name: cat.name, icon: cat.icon || '', description: cat.description || '' });
                                    setShowCategoryModal(true);
                                }}
                                style={{
                                    padding: '6px 10px',
                                    background: 'var(--sa-surface-2)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '6px',
                                    color: 'var(--sa-primary-text)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '700'
                                }}
                                title="Editar"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => onDeleteCategory(cat.id)}
                                style={{
                                    padding: '6px 10px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    borderRadius: '6px',
                                    color: 'var(--sa-danger)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '700'
                                }}
                                title="Eliminar"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subcategories Section */}
            <div style={{
                background: 'linear-gradient(145deg, var(--sa-surface), var(--sa-surface))',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid var(--sa-border)',
                boxShadow: '0 4px 25px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--sa-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📂</span> Subcategorías ({subcategories.length})
                    </h3>
                    <button
                        onClick={() => {
                            setEditingSubcategory(null);
                            setSubcategoryForm({ name: '', description: '', category_id: '' });
                            setShowSubcategoryModal(true);
                        }}
                        style={{
                            padding: '7px 14px',
                            background: 'linear-gradient(135deg, var(--sa-primary), var(--sa-primary))',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        + Nueva
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sortedSubcategories.map((sub) => {
                        const parentCat = categories.find(c => c.id === sub.category_id);
                        return (
                            <div key={sub.id} style={{
                                padding: '12px 14px',
                                background: 'var(--sa-surface)',
                                borderRadius: '10px',
                                border: '1px solid var(--sa-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--sa-text)' }}>
                                        {sub.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--sa-text-muted)' }}>
                                        {parentCat ? `${parentCat.icon || ''} ${parentCat.name}` : 'Sin categoría padre'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingSubcategory(sub);
                                        setSubcategoryForm({ name: sub.name, description: sub.description || '', category_id: sub.category_id });
                                        setShowSubcategoryModal(true);
                                    }}
                                    style={{
                                        padding: '6px 10px',
                                        background: 'var(--sa-surface-2)',
                                        border: '1px solid var(--sa-border-strong)',
                                        borderRadius: '6px',
                                        color: 'var(--sa-primary-text)',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: '700'
                                    }}
                                    title="Editar"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => onDeleteSubcategory(sub.id)}
                                    style={{
                                        padding: '6px 10px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                        borderRadius: '6px',
                                        color: 'var(--sa-danger)',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: '700'
                                    }}
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <SimpleModal
                    title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                    onClose={() => setShowCategoryModal(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)' }}>
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--sa-surface)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)' }}>
                                Icono (Emoji)
                            </label>
                            <input
                                type="text"
                                value={categoryForm.icon}
                                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                                placeholder="🎾"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--sa-surface)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)' }}>
                                Descripción
                            </label>
                            <textarea
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--sa-surface)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                style={{
                                    padding: '10px 16px',
                                    background: 'var(--sa-surface-2)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveCategory}
                                style={{
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, var(--sa-primary), var(--sa-primary))',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </SimpleModal>
            )}

            {/* Subcategory Modal */}
            {showSubcategoryModal && (
                <SimpleModal
                    title={editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
                    onClose={() => setShowSubcategoryModal(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)' }}>
                                Categoría Padre
                            </label>
                            <select
                                value={subcategoryForm.category_id}
                                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--sa-surface)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="">Seleccionar categoría...</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--sa-text-2)' }}>
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={subcategoryForm.name}
                                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--sa-surface)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                onClick={() => setShowSubcategoryModal(false)}
                                style={{
                                    padding: '10px 16px',
                                    background: 'var(--sa-surface-2)',
                                    border: '1px solid var(--sa-border-strong)',
                                    borderRadius: '8px',
                                    color: 'var(--sa-text)',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSubcategory}
                                style={{
                                    padding: '10px 20px',
                                    background: 'linear-gradient(135deg, var(--sa-primary), var(--sa-primary))',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </SimpleModal>
            )}
        </div>
    );
}
