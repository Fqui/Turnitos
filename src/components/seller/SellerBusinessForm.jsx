import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';
import BusinessFormModal from './BusinessFormModal';
import './superadmin.css';

// Sellers use the same business form as the SuperAdmin, in seller mode
const SellerBusinessForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [business, setBusiness] = useState(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState('');

    const [seller] = useState(() => {
        try { return JSON.parse(localStorage.getItem('seller')) || null; } catch { return null; }
    });
    const [theme] = useState(() => {
        try {
            const saved = localStorage.getItem('sa-theme');
            if (saved === 'light' || saved === 'dark') return saved;
        } catch { /* storage unavailable */ }
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [categoriesData, subcategoriesData, businessData] = await Promise.all([
                    supabaseService.getCategories(),
                    supabaseService.getSubcategories(),
                    id ? supabaseService.getBusinessById(id) : Promise.resolve(null)
                ]);
                if (cancelled) return;
                if (id && (!businessData || businessData.seller_id !== seller?.id)) {
                    setError('No encontramos ese negocio entre los tuyos.');
                }
                setCategories(categoriesData || []);
                setSubcategories(subcategoriesData || []);
                setBusiness(businessData);
            } catch (err) {
                console.error('Error loading business form:', err);
                if (!cancelled) setError('No se pudo cargar el formulario. Probá de nuevo.');
            } finally {
                if (!cancelled) setReady(true);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id, seller?.id]);

    const backToList = () => navigate('/admin/businesses');

    return (
        <div className="sa-root" data-theme={theme} style={{ minHeight: '100vh', background: 'var(--sa-bg)', color: 'var(--sa-text)' }}>
            {!ready ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--sa-text-muted)' }}>Cargando...</div>
            ) : error ? (
                <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <p style={{ marginBottom: '16px' }}>{error}</p>
                    <button
                        type="button"
                        onClick={backToList}
                        style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--sa-border-strong)', background: 'var(--sa-surface)', color: 'var(--sa-text)', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Volver a Mis Negocios
                    </button>
                </div>
            ) : (
                <BusinessFormModal
                    mode="seller"
                    sellerId={seller?.id}
                    business={business}
                    categories={categories}
                    subcategories={subcategories}
                    onClose={backToList}
                    onSave={() => { /* the list reloads when we go back */ }}
                />
            )}
        </div>
    );
};

export default SellerBusinessForm;
