import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import sportCanteenService, { summarizeMovements } from '../../../services/sportCanteenService';
import { Button, Kpi, Spinner } from './CashUi';
import { RegisterDetailModal } from './CashModals';
import { dayParts, differenceLabel, differenceTone, formatMoney, formatTime } from './cashFormat';

const toneClass = (tone) => ({ red: 'cc-neg', amber: 'cc-warn', green: 'cc-pos' }[tone] || '');

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
                <div className="cc-loading"><Spinner large /><span>Cargando…</span></div>
            ) : (
                <>
                    <div className="cc-kpis">
                        <Kpi main label="Neto del mes" value={formatMoney(totals.net)} hint={`${data.registers.length} ${data.registers.length === 1 ? 'caja cerrada' : 'cajas cerradas'}`} />
                        <Kpi label="Turnos" value={formatMoney(totals.bookings)} />
                        <Kpi label="Artículos" value={formatMoney(totals.canteen)} hint={totals.manualIncome > 0 ? `Otros ingresos ${formatMoney(totals.manualIncome)}` : undefined} />
                        <Kpi label="Gastos" value={totals.expenses > 0 ? `-${formatMoney(totals.expenses)}` : formatMoney(0)} className={totals.expenses > 0 ? 'cc-neg' : ''} />
                        <Kpi label="Diferencias" value={formatMoney(differences)} className={toneClass(differenceTone(differences))} />
                    </div>

                    <div className="cc-card cc-card--flush">
                        <div className="cc-section-head">
                            <h3 className="cc-card-title">Cajas cerradas</h3>
                        </div>

                        {data.registers.length === 0 ? (
                            <div className="cc-muted" style={{ padding: '28px 20px', fontSize: '14px' }}>
                                No hay cajas cerradas en este mes.
                            </div>
                        ) : (
                            <div className="cc-ledger cc-ledger--registers">
                                <div className="cc-ledger-head" aria-hidden="true">
                                    <span>Fecha</span>
                                    <span>Encargado</span>
                                    <span className="cc-cell-right">Contado</span>
                                    <span className="cc-cell-right">Transferencias</span>
                                    <span className="cc-cell-right">Diferencia</span>
                                </div>
                                {data.registers.map(r => {
                                    const tone = differenceTone(r.difference);
                                    const { day, weekday } = dayParts(r.opened_at);
                                    return (
                                        <button key={r.id} type="button" className="cc-ledger-row cc-ledger-row--button" onClick={() => setSelected(r)}>
                                            <span className="cc-cell-date">
                                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{weekday} {day}</span>
                                                <span className="cc-cell-sub" style={{ display: 'block' }}>{formatTime(r.opened_at)}–{formatTime(r.closed_at)}</span>
                                            </span>
                                            <span className="cc-cell-main">
                                                <span className="cc-cell-title" style={{ display: 'block' }}>{r.closed_by || r.opened_by}</span>
                                                {r.notes && <span className="cc-cell-sub cc-hide-mobile" style={{ display: 'block' }}>{r.notes}</span>}
                                            </span>
                                            <span className="cc-cell-amount cc-cell-counted">{formatMoney(r.final_cash_counted)}</span>
                                            <span className="cc-cell-amount cc-cell-transfers" style={{ fontWeight: 500 }}>{formatMoney(r.expected_transfers)}</span>
                                            <span className={`cc-cell-amount cc-cell-diff ${toneClass(tone)}`}>{differenceLabel(r.difference)}</span>
                                            <span className="cc-cell-meta-mobile">
                                                <span style={{ textTransform: 'capitalize' }}>{weekday} {day}</span> · {formatTime(r.opened_at)}–{formatTime(r.closed_at)} · Transf. {formatMoney(r.expected_transfers)}
                                            </span>
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
