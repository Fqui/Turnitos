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
    showTitle = true
}) {
    return (
        <div style={{
            padding: isMobile ? '16px' : '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)',
            gap: isMobile ? '16px' : '0'
        }}>
            {/* Left side: Title + Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start',
                gap: isMobile ? '12px' : '16px',
                flexWrap: 'wrap',
                width: isMobile ? '100%' : 'auto'
            }}>
                {!isMobile && showTitle && (
                    <h3 style={{
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: '700',
                        color: 'var(--text-primary)'
                    }}>
                        {title}
                    </h3>
                )}

                {/* View Mode Toggle */}
                <ViewModeToggle
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    availableViews={availableViews}
                    isMobile={isMobile}
                />

                {/* Navigation Controls */}
                <NavigationControls
                    onPrevious={onPrevious}
                    onToday={onToday}
                    onNext={onNext}
                    isMobile={isMobile}
                />
            </div>

            {/* Right side: Date Range */}
            <span style={{
                fontSize: isMobile ? '18px' : '16px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                textAlign: 'center',
                display: 'block'
            }}>
                {dateRangeText}
            </span>
        </div>
    );
}
