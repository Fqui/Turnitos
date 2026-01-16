import React from 'react';

export default function NavigationControls({
    onPrevious,
    onToday,
    onNext,
    isMobile = false
}) {
    return (
        <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--bg-main)',
            padding: '4px',
            borderRadius: '10px'
        }}>
            <button
                onClick={onPrevious}
                style={{
                    border: 'none',
                    background: 'transparent',
                    padding: isMobile ? '6px 12px' : '6px 12px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                ◀
            </button>

            <button
                onClick={onToday}
                style={{
                    border: 'none',
                    background: 'white',
                    padding: isMobile ? '6px 16px' : '6px 16px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#000',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                Hoy
            </button>

            <button
                onClick={onNext}
                style={{
                    border: 'none',
                    background: 'transparent',
                    padding: isMobile ? '6px 12px' : '6px 12px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                ▶
            </button>
        </div>
    );
}
