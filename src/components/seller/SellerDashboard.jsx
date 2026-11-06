import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, Wallet, CalendarRange, Camera, Plus, ChevronRight } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import { formatMoney } from '../../utils/billingUtils';
import DemoBadge from './DemoBadge';
import SellerShell from './SellerShell';
import SellerStatusBadge from './SellerStatusBadge';

const SellerDashboard = () => {
    const [seller, setSeller] = useState(null);
    const [stats, setStats] = useState(null);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const sellerData = JSON.parse(localStorage.getItem('seller'));
            setSeller(sellerData);

            // Load stats and businesses in parallel
            const [statsData, businessesData] = await Promise.all([
                supabaseService.getSellerStats(sellerData.id),
                supabaseService.getSellerBusinesses(sellerData.id)
            ]);

            setStats(statsData);
            setBusinesses(businessesData.slice(0, 5)); // Show only first 5
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SellerShell>
            <div className="sp-head">
                <div>
                    <h1 className="sp-title">Hola, {seller?.first_name}</h1>
                    <p className="sp-sub">Así vienen tus negocios y tus comisiones.</p>
                </div>
                <div className="sp-actions">
                    <button type="button" className="sp-btn sp-btn-primary" onClick={() => navigate('/admin/demo-instagram')}>
                        <Camera size={16} aria-hidden="true" /> Demo desde Instagram
                    </button>
                    <button type="button" className="sp-btn" onClick={() => navigate('/admin/businesses/new')}>
                        <Plus size={16} aria-hidden="true" /> Nuevo negocio
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="sp-loading">Cargando tu panel...</div>
            ) : (
                <>
                    <div className="sp-stats">
                        <StatCard
                            icon={Wallet}
                            title="Comisiones del mes"
                            value={formatMoney(stats?.monthlyCommissions)}
                            note="Acumulado hasta hoy"
                            highlight
                        />
                        <StatCard
                            icon={CalendarRange}
                            title="Proyección del mes"
                            value={formatMoney(stats?.projection?.projectedTotal)}
                            note={`${formatMoney(stats?.projection?.dailyAverage)} por día`}
                        />
                        <StatCard
                            icon={Building2}
                            title="Negocios"
                            value={stats?.totalBusinesses || 0}
                            note={`${stats?.activeBusinesses || 0} ${stats?.activeBusinesses === 1 ? 'activo' : 'activos'}, ${stats?.trialBusinesses || 0} en prueba`}
                        />
                        <StatCard
                            icon={TrendingUp}
                            title="Conversión"
                            value={`${Math.round(stats?.conversionRate || 0)}%`}
                            note="Negocios que pagaron"
                        />
                    </div>

                    <section className="sp-card">
                        <div className="sp-card-head">
                            <h2 className="sp-card-title">Negocios recientes</h2>
                            {businesses.length > 0 && (
                                <button type="button" className="sp-link" onClick={() => navigate('/admin/businesses')}>Ver todos</button>
                            )}
                        </div>

                        {businesses.length === 0 ? (
                            <div className="sp-empty">
                                <h3>Todavía no tenés negocios</h3>
                                <p>Armá una demo desde Instagram para mostrársela a tu primer cliente.</p>
                                <button type="button" className="sp-btn sp-btn-primary" onClick={() => navigate('/admin/demo-instagram')}>
                                    Crear mi primera demo
                                </button>
                            </div>
                        ) : (
                            businesses.map((business) => (
                                <button
                                    type="button"
                                    key={business.id}
                                    className="sp-row"
                                    onClick={() => navigate(`/admin/businesses/${business.id}/edit`)}
                                >
                                    <span className="sp-avatar" aria-hidden="true">{business.categories?.icon || '🏢'}</span>
                                    <span className="sp-row-main">
                                        <span className="sp-row-name" style={{ display: 'block' }}>{business.name}</span>
                                        <span className="sp-row-meta" style={{ display: 'block' }}>
                                            {business.categories?.name} · {business.totalBookings} reservas
                                        </span>
                                    </span>
                                    <span className="sp-badges">
                                        {business.metadata?.simulacion === true && <DemoBadge />}
                                        <SellerStatusBadge status={business.subscription_status} />
                                    </span>
                                    <ChevronRight size={18} color="var(--sa-text-muted)" aria-hidden="true" />
                                </button>
                            ))
                        )}
                    </section>
                </>
            )}
        </SellerShell>
    );
};

const StatCard = ({ icon: Icon, title, value, note, highlight }) => (
    <div className={`sp-stat${highlight ? ' is-highlight' : ''}`}>
        <div className="sp-stat-label"><Icon size={15} aria-hidden="true" /> {title}</div>
        <div className="sp-stat-value">{value}</div>
        <div className="sp-stat-note">{note}</div>
    </div>
);

export default SellerDashboard;
