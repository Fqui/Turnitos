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
    showLegend = false
}) {
    const legendItems = [
        { label: 'Pendiente', color: 'var(--status-pending)' },
        { label: 'Señado', color: 'var(--status-deposit)' },
        { label: 'Confirmado', color: 'var(--status-confirmed)' },
        { label: 'Finalizado', color: 'var(--status-completed)' },
        { label: 'Cancelado', color: 'var(--status-cancelled)' },
        { label: 'Bloqueado', color: 'var(--status-blocked)' }
    ];

    return (
        <div style={{
            padding: isMobile ? '12px 16px' : '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)',
            gap: isMobile ? '12px' : '16px'
        }}>
            {/* Left side: Status Legend or Title */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '14px',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
                {showLegend && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '8px' : '12px',
                        flexWrap: 'wrap',
                        fontSize: '12px',
                        fontWeight: '600'
                    }}>
                        {legendItems.map(s => (
                            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                )}
                {!showLegend && !isMobile && showTitle && (
                    <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--text-primary)'
                    }}>
                        {title}
                    </h3>
                )}
            </div>

            {/* Middle: Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: 'center'
            }}>
                <ViewModeToggle
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    availableViews={availableViews}
                    isMobile={isMobile}
                />
                <NavigationControls
                    onPrevious={onPrevious}
                    onToday={onToday}
                    onNext={onNext}
                    isMobile={isMobile}
                />
            </div>

            {/* Right side: Date Range */}
            <span style={{
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                textAlign: 'center',
                display: 'block',
                textTransform: 'capitalize'
            }}>
                {dateRangeText}
            </span>
        </div>
    );
}
