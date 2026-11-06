import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ExternalLink } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import RegisterPaymentModal from './RegisterPaymentModal';
import DemoBadge from './DemoBadge';
import SellerShell from './SellerShell';
import SellerStatusBadge from './SellerStatusBadge';
import { getBillingInfo, formatDueText, formatMoney } from '../../utils/billingUtils';

const isDemo = (business) => business.metadata?.simulacion === true;

const FILTERS = { all: 'Todos', demo: 'Demos', trial: 'Prueba', active: 'Activos', inactive: 'Inactivos' };

const SellerBusinessList = () => {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, demo, trial, active, inactive
    const [searchTerm, setSearchTerm] = useState('');
    const [subscriptions, setSubscriptions] = useState([]);
    const [paymentTarget, setPaymentTarget] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();

    const deleteDemo = async (business) => {
        if (!window.confirm(`¿Borrar la demo "${business.name}"? Se borran su link, sus fotos y su acceso. No se puede deshacer.`)) return;
        setDeletingId(business.id);
        try {
            await supabaseService.deleteDemoBusiness(business.id);
            setBusinesses(list => list.filter(b => b.id !== business.id));
        } catch (error) {
            window.alert(error.message || 'No se pudo borrar la demo');
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        loadBusinesses();
    }, []);

    const loadBusinesses = async () => {
        try {
            const sellerData = JSON.parse(localStorage.getItem('seller'));
            const [data, billing] = await Promise.all([
                supabaseService.getSellerBusinesses(sellerData.id),
                supabaseService.getBillingData().catch(() => ({ subscriptions: [] }))
            ]);
            setBusinesses(data);
            setSubscriptions(billing.subscriptions || []);
        } catch (error) {
            console.error('Error loading businesses:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBusinesses = businesses.filter(business => {
        const matchesFilter = filter === 'all'
            || (filter === 'demo' ? isDemo(business) : business.subscription_status === filter);
        const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <SellerShell>
            <div className="sp-head">
                <div>
                    <h1 className="sp-title">Mis negocios</h1>
                    <p className="sp-sub">
                        {filteredBusinesses.length} negocio{filteredBusinesses.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="sp-actions">
                    <button type="button" className="sp-btn sp-btn-primary" onClick={() => navigate('/admin/businesses/new')}>
                        <Plus size={16} aria-hidden="true" /> Nuevo negocio
                    </button>
                </div>
            </div>

            <div className="sp-filters">
                <input
                    type="text"
                    className="sp-input"
                    placeholder="Buscar por nombre..."
                    aria-label="Buscar por nombre"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="sp-chips">
                    {Object.entries(FILTERS).map(([status, label]) => (
                        <button
                            key={status}
                            type="button"
                            className={`sp-chip${filter === status ? ' is-active' : ''}`}
                            onClick={() => setFilter(status)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="sp-loading">Cargando negocios...</div>
            ) : filteredBusinesses.length === 0 ? (
                <div className="sp-card sp-empty">
                    <h3>No se encontraron negocios</h3>
                    <p>{searchTerm ? 'Probá con otro nombre.' : 'Creá tu primer negocio para empezar.'}</p>
                    {!searchTerm && (
                        <button type="button" className="sp-btn sp-btn-primary" onClick={() => navigate('/admin/businesses/new')}>
                            Crear negocio
                        </button>
                    )}
                </div>
            ) : (
                <div className="sp-biz-list">
                    {filteredBusinesses.map((business) => {
                        const billingInfo = getBillingInfo(business, subscriptions.find(sub => String(sub.business_id) === String(business.id)));
                        const dueTone = billingInfo.tone === 'danger' || billingInfo.tone === 'warning' ? ` is-${billingInfo.tone}` : '';
                        return (
                            <div
                                key={business.id}
                                className={`sp-card sp-biz${deletingId === business.id ? ' is-busy' : ''}`}
                                onClick={() => navigate(`/admin/businesses/${business.id}/edit`)}
                            >
                                <div className="sp-biz-main">
                                    <span className="sp-avatar" aria-hidden="true">{business.categories?.icon || '🏢'}</span>
                                    <div className="sp-row-main">
                                        <div className="sp-biz-title">
                                            <span className="sp-row-name">{business.name}</span>
                                            {isDemo(business) && <DemoBadge />}
                                            <SellerStatusBadge status={business.subscription_status} />
                                        </div>
                                        <div className="sp-row-meta">
                                            {business.categories?.name} · {business.location} · {business.totalBookings} reservas
                                        </div>
                                        <div className={`sp-due${dueTone}`}>
                                            {billingInfo.label} · {formatDueText(billingInfo)}
                                            {billingInfo.monthlyPrice ? ` · ${formatMoney(billingInfo.monthlyPrice)}/mes` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="sp-biz-actions">
                                    {isDemo(business) && (
                                        <>
                                            <a
                                                className="sp-btn sp-btn-sm"
                                                href={`https://${business.slug}.turnitoslr.com`}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Ver demo <ExternalLink size={13} aria-hidden="true" />
                                            </a>
                                            <button
                                                type="button"
                                                className="sp-btn sp-btn-sm sp-btn-danger"
                                                disabled={deletingId === business.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteDemo(business);
                                                }}
                                            >
                                                {deletingId === business.id ? 'Borrando…' : 'Borrar demo'}
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        className="sp-btn sp-btn-sm sp-btn-primary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPaymentTarget({ business, monthlyPrice: billingInfo.monthlyPrice });
                                        }}
                                    >
                                        Registrar pago
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {paymentTarget && (
                <RegisterPaymentModal
                    business={paymentTarget.business}
                    monthlyPrice={paymentTarget.monthlyPrice}
                    onClose={() => setPaymentTarget(null)}
                    onRegistered={() => {
                        setPaymentTarget(null);
                        loadBusinesses();
                    }}
                />
            )}
        </SellerShell>
    );
};

export default SellerBusinessList;
