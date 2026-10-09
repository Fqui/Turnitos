import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, Download, History, Scale, ShoppingCart, TrendingDown, Wallet } from 'lucide-react';
import sportCanteenService, { summarizeMovements } from '../../../services/sportCanteenService';
import { Badge, Button, EmptyState, Spinner, StatCard } from './CashUi';
import { RegisterDetailModal } from './CashModals';
import { dayParts, differenceLabel, differenceTone, formatDate, formatMoney, formatTime } from './cashFormat';

const monthLabel = (year, month) => {
    const label = new Date(year, month, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1); // "Octubre de 2026"
};

export default function HistoryTab({ business, refreshKey, showToast }) {
    const now = new Date();
    const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const [data, setData] = useState({ registers: [], movements: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await sportCanteenService.getMonthHistory(business.id, period.year, period.month));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [business.id, period.year, period.month]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    const isCurrentMonth = period.year === now.getFullYear() && period.month === now.getMonth();
    const shiftMonth = (delta) => setPeriod(prev => {
        const d = new Date(prev.year, prev.month + delta, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    const totals = useMemo(() => summarizeMovements(data.movements), [data.movements]);
    const differences = data.registers.reduce((sum, r) => sum + (Number(r.difference) || 0), 0);
    const movementsByRegister = useMemo(() => {
        const map = new Map();
        data.movements.forEach(m => {
            if (!map.has(m.cash_register_id)) map.set(m.cash_register_id, []);
            map.get(m.cash_register_id).push(m);
        });
        return map;
    }, [data.movements]);

    const handleExport = () => {
        if (data.registers.length === 0) {
            showToast?.('No hay cajas cerradas en este mes', 'info');
            return;
        }
        const csv = sportCanteenService.buildMonthCsv(data.registers, data.movements);
        const slug = String(business.slug || business.name || 'caja').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const mm = String(period.month + 1).padStart(2, '0');
        sportCanteenService.downloadCsv(`caja-${slug}-${period.year}-${mm}.csv`, csv);
        showToast?.('Descargamos el archivo para Excel', 'success');
    };

    return (
        <>
            <div className="cc-between">
                <div className="cc-month">
                    <Button variant="ghost" className="cc-btn--icon" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
                        <ChevronLeft size={18} />
                    </Button>
                    <strong>{monthLabel(period.year, period.month)}</strong>
                    <Button variant="ghost" className="cc-btn--icon" onClick={() => shiftMonth(1)} disabled={isCurrentMonth} aria-label="Mes siguiente">
                        <ChevronRight size={18} />
                    </Button>
                </div>
                <Button icon={Download} onClick={handleExport} disabled={loading || data.registers.length === 0}>
                    Exportar a Excel (CSV)
                </Button>
            </div>

            {error && <div className="cc-alert">{error}</div>}

            {loading ? (
                <div className="cc-card cc-loading"><Spinner large /><span>Cargando historial...</span></div>
            ) : (
                <>
                    <div className="cc-stats">
                        <StatCard hero icon={Wallet} tone="green" label="Neto del mes" value={formatMoney(totals.net)} hint={`${data.registers.length} ${data.registers.length === 1 ? 'caja cerrada' : 'cajas cerradas'}`} />
                        <StatCard icon={CalendarCheck} tone="blue" label="Turnos" value={formatMoney(totals.bookings)} hint={totals.manualIncome > 0 ? `Otros ingresos ${formatMoney(totals.manualIncome)}` : undefined} />
                        <StatCard icon={ShoppingCart} tone="green" label="Artículos" value={formatMoney(totals.canteen)} />
                        <StatCard icon={TrendingDown} tone="red" label="Gastos" value={formatMoney(totals.expenses)} />
                    </div>

                    <div className="cc-card">
                        <div className="cc-between" style={{ marginBottom: '6px' }}>
                            <div>
                                <h3 className="cc-card-title">Cajas cerradas</h3>
                                <p className="cc-card-subtitle">Tocá una para ver el detalle y reenviar el resumen.</p>
                            </div>
                            {data.registers.length > 0 && (
                                <Badge tone={differenceTone(differences)}>
                                    <Scale size={12} /> Diferencias: {formatMoney(differences)}
                                </Badge>
                            )}
                        </div>

                        {data.registers.length === 0 ? (
                            <EmptyState icon={History} title="Sin cajas cerradas" text="Cuando cierres una caja, va a aparecer acá con su arqueo." />
                        ) : (
                            <div className="cc-list">
                                {data.registers.map(r => {
                                    const regTotals = summarizeMovements(movementsByRegister.get(r.id) || [], r.initial_cash);
                                    const tone = differenceTone(r.difference);
                                    return (
                                        <button key={r.id} type="button" className="cc-list-item cc-list-item--button" onClick={() => setSelected(r)}>
                                            <span className="cc-list-icon" style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', flexDirection: 'column', lineHeight: 1 }}>
                                                <strong style={{ fontSize: '15px' }}>{dayParts(r.opened_at).day}</strong>
                                                <span style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                                                    {dayParts(r.opened_at).weekday}
                                                </span>
                                            </span>
                                            <div className="cc-list-main">
                                                <div className="cc-list-title">{r.closed_by || r.opened_by}</div>
                                                <div className="cc-list-meta">
                                                    <span>{formatDate(r.opened_at)} · {formatTime(r.opened_at)} a {formatTime(r.closed_at)}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span>Transf. {formatMoney(r.expected_transfers)}</span>
                                                    <span className="cc-hide-mobile" aria-hidden="true">·</span>
                                                    <span className="cc-hide-mobile">Neto {formatMoney(regTotals.net)}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div className="cc-list-amount">{formatMoney(r.final_cash_counted)}</div>
                                                <Badge tone={tone} style={{ marginTop: '2px' }}>{differenceLabel(r.difference)}</Badge>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {selected && (
                <RegisterDetailModal
                    business={business}
                    register={selected}
                    movements={(movementsByRegister.get(selected.id) || []).slice().reverse()}
                    onClose={() => setSelected(null)}
                    showToast={showToast}
                />
            )}
        </>
    );
}
