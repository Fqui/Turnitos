import React from 'react';
import ViewModeToggle from './ViewModeToggle';
import NavigationControls from './NavigationControls';

export default function CalendarHeader({
    title,
    dateRangeText,
    viewMode,
    setViewMode,
    availableViews,
    onPrevious,
    onToday,
    onNext,
    isMobile = false,
    showTitle = true,
    showLegend = true
}) {
    const legendItems = [
        { label: 'Pendiente', color: 'var(--status-pending, #9CA3AF)' },
        { label: 'Señado', color: 'var(--status-deposit, #F59E0B)' },
        { label: 'Confirmado', color: 'var(--status-confirmed, #3ECF8E)' },
        { label: 'Finalizado', color: 'var(--status-completed, #2563EB)' },
        { label: 'Cancelado', color: 'var(--status-cancelled, #EF4444)' },
        { label: 'Bloqueado', color: 'var(--status-blocked, #374151)' }
    ];

    // Only show ViewModeToggle if there is more than 1 view available (e.g. day AND month)
    const showViewToggle = availableViews && availableViews.length > 1;

    return (
        <div style={{
            padding: isMobile ? '12px 14px' : '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)',
            gap: isMobile ? '12px' : '16px'
        }}>
            {/* Legend */}
            {showLegend && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '6px 10px' : '12px',
                    flexWrap: 'wrap',
                    fontSize: '11px',
                    fontWeight: '600',
                    justifyContent: isMobile ? 'center' : 'flex-start'
                }}>
                    {legendItems.map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Navigation: [ ◀ ]  Mes y Año  [ ▶ ]  [ Hoy ] */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'center',
                width: isMobile ? '100%' : 'auto'
            }}>
                {showViewToggle && (
                    <ViewModeToggle
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        availableViews={availableViews}
                        isMobile={isMobile}
                    />
                )}

                <button
                    type="button"
                    onClick={onPrevious}
                    style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        transition: 'all 0.2s'
                    }}
                    title="Mes anterior"
                >
                    ◀
                </button>

                <span style={{
                    fontSize: isMobile ? '15px' : '17px',
                    fontWeight: '800',
                    color: 'var(--text-primary)',
                    textAlign: 'center',
                    textTransform: 'capitalize',
                    minWidth: isMobile ? '140px' : '170px'
                }}>
                    {dateRangeText}
                </span>

                <button
                    type="button"
                    onClick={onNext}
                    style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        transition: 'all 0.2s'
                    }}
                    title="Mes siguiente"
                >
                    ▶
                </button>

                <button
                    type="button"
                    onClick={onToday}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.2s',
                        marginLeft: '4px'
                    }}
                    title="Ir a hoy"
                >
                    Hoy
                </button>
            </div>
        </div>
    );
}
