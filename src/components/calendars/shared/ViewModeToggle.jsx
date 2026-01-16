import React from 'react';

export default function ViewModeToggle({ viewMode, setViewMode, availableViews = ['day', 'week', 'month'], isMobile = false }) {
    const viewLabels = {
        day: 'Día',
        week: 'Semana',
        month: 'Mes',
        year: 'Año'
    };

    return (
        <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--bg-main)',
            padding: '4px',
            borderRadius: '10px'
        }}>
            {availableViews.map(view => (
                <button
                    key={view}
                    onClick={() => setViewMode(view)}
                    style={{
                        border: 'none',
                        background: viewMode === view ? 'white' : 'transparent',
                        padding: isMobile ? '6px 16px' : '8px 20px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontWeight: viewMode === view ? '700' : '500',
                        fontSize: '13px',
                        color: viewMode === view ? '#000' : 'var(--text-secondary)',
                        boxShadow: viewMode === view ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    {viewLabels[view]}
                </button>
            ))}
        </div>
    );
}
