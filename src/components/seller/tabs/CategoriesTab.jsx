import React, { useState } from 'react';
import supabaseService from '../../../services/supabaseService';

function SimpleModal({ title, children, onClose }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.8)',
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
                    background: '#151c2c',
                    borderRadius: '16px',
                    padding: '26px',
                    maxWidth: '480px',
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '18px', margin: 0, color: '#f1f5f9' }}>
                    {title}
                </h2>
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
            } else {
                await supabaseService.createCategory(categoryForm);
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryForm({ name: '', icon: '', description: '' });
            if (onReload) onReload();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSaveSubcategory = async () => {
        try {
            if (editingSubcategory) {
                await supabaseService.updateSubcategory(editingSubcategory.id, subcategoryForm);
            } else {
                await supabaseService.createSubcategory(subcategoryForm);
            }
            setShowSubcategoryModal(false);
            setEditingSubcategory(null);
            setSubcategoryForm({ name: '', description: '', category_id: '' });
            if (onReload) onReload();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
        }}>
            {/* Categories Section */}
            <div style={{
                background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.85))',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 25px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
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
                            background: '#0f172a',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {cat.icon || '📁'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>
                                    {cat.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '6px',
                                    color: '#60a5fa',
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
                                    color: '#f87171',
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
                background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.85))',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 25px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
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
                    {subcategories.map((sub) => {
                        const parentCat = categories.find(c => c.id === sub.category_id);
                        return (
                            <div key={sub.id} style={{
                                padding: '12px 14px',
                                background: '#0f172a',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>
                                        {sub.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
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
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '6px',
                                        color: '#60a5fa',
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
                                        color: '#f87171',
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
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
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
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                                Descripción
                            </label>
                            <textarea
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: 'white',
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
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: 'white',
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
                                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
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
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                                Categoría Padre
                            </label>
                            <select
                                value={subcategoryForm.category_id}
                                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: 'white',
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
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={subcategoryForm.name}
                                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: 'white',
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
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: 'white',
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
                                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
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
