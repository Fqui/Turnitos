import React, { useState, useEffect } from 'react';
import { Wallet, CalendarRange, TrendingUp } from 'lucide-react';
import supabaseService from '../../services/supabaseService';
import { formatMoney } from '../../utils/billingUtils';
import SellerShell from './SellerShell';

const SellerCommissionsReport = () => {
    const [commissions, setCommissions] = useState([]);
    const [projection, setProjection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    // Each seller's agreed rates (sellers.first_month_rate / recurring_rate)
    const [rates] = useState(() => {
        try {
            const seller = JSON.parse(localStorage.getItem('seller')) || {};
            return { first: Number(seller.first_month_rate ?? 50), recurring: Number(seller.recurring_rate ?? 30) };
        } catch {
            return { first: 50, recurring: 30 };
        }
    });

    useEffect(() => {
        loadCommissions();
    }, [selectedMonth, selectedYear]);

    const loadCommissions = async () => {
        setLoading(true);
        try {
            const sellerData = JSON.parse(localStorage.getItem('seller'));
            const [commissionsData, projectionData] = await Promise.all([
                supabaseService.getSellerCommissions(sellerData.id, selectedMonth, selectedYear),
                supabaseService.getSellerMonthlyProjection(sellerData.id)
            ]);

            setCommissions(commissionsData);
            setProjection(projectionData);
        } catch (error) {
            console.error('Error loading commissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const currentDate = new Date();
    const isCurrentMonth = selectedMonth === currentDate.getMonth() + 1 && selectedYear === currentDate.getFullYear();
    const showProjection = isCurrentMonth && projection;

    return (
        <SellerShell>
            <div className="sp-head">
                <div>
                    <h1 className="sp-title">Comisiones</h1>
                    <p className="sp-sub">Lo que generaste en cada mes.</p>
                </div>
                <div className="sp-actions">
                    <select
                        className="sp-select"
                        aria-label="Mes"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {months.map((month, index) => (
                            <option key={index} value={index + 1}>{month}</option>
                        ))}
                    </select>
                    <select
                        className="sp-select"
                        aria-label="Año"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={`sp-stats${showProjection ? ' sp-stats-3' : ''}`} style={showProjection ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div className="sp-stat is-highlight">
                    <div className="sp-stat-label"><Wallet size={15} aria-hidden="true" /> Total del período</div>
                    <div className="sp-stat-value">{formatMoney(commissions.total)}</div>
                    <div className="sp-stat-note">{commissions.commissions?.length || 0} comisiones</div>
                </div>
                {showProjection && (
                    <>
                        <div className="sp-stat">
                            <div className="sp-stat-label"><CalendarRange size={15} aria-hidden="true" /> Proyección del mes</div>
                            <div className="sp-stat-value">{formatMoney(projection.projectedTotal)}</div>
                            <div className="sp-stat-note">Basado en {projection.daysPassed} días</div>
                        </div>
                        <div className="sp-stat">
                            <div className="sp-stat-label"><TrendingUp size={15} aria-hidden="true" /> Promedio diario</div>
                            <div className="sp-stat-value">{formatMoney(projection.dailyAverage)}</div>
                            <div className="sp-stat-note">{projection.daysRemaining} días restantes</div>
                        </div>
                    </>
                )}
            </div>

            <section className="sp-card">
                <div className="sp-card-head">
                    <h2 className="sp-card-title">Detalle</h2>
                </div>

                {loading ? (
                    <div className="sp-loading">Cargando...</div>
                ) : !commissions.commissions?.length ? (
                    <div className="sp-empty">
                        <p>No hay comisiones en este período.</p>
                    </div>
                ) : (
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>Negocio</th>
                                <th>Suscripción</th>
                                <th className="is-num">Pago</th>
                                <th className="is-num">Tasa</th>
                                <th className="is-num">Comisión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commissions.commissions.map((commission) => (
                                <tr key={commission.id}>
                                    <td data-label="Negocio" className="is-strong">{commission.businesses?.name}</td>
                                    <td data-label="Suscripción">Mes {commission.subscription_month}</td>
                                    <td data-label="Pago" className="is-num">{formatMoney(commission.payment_amount)}</td>
                                    <td data-label="Tasa" className="is-num">
                                        <span>
                                            {commission.base_commission_rate}%
                                            {commission.volume_bonus > 0 && <span className="sp-bonus">+{commission.volume_bonus}%</span>}
                                        </span>
                                    </td>
                                    <td data-label="Comisión" className="is-num is-money">{formatMoney(commission.commission_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="4" data-label="Total"></td>
                                <td className="is-num is-money">{formatMoney(commissions.total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </section>

            <section className="sp-card sp-gap">
                <div className="sp-card-head">
                    <h2 className="sp-card-title">Cómo se calculan</h2>
                </div>
                <div className="sp-rates">
                    <div>
                        <div className="sp-rate-value">{rates.first}%</div>
                        <div className="sp-rate-label">Primer mes que paga</div>
                    </div>
                    <div>
                        <div className="sp-rate-value">{rates.recurring}%</div>
                        <div className="sp-rate-label">Cada mes siguiente, mientras siga pagando</div>
                    </div>
                </div>
            </section>
        </SellerShell>
    );
};

export default SellerCommissionsReport;
