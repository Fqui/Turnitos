import React, { useState, useRef, useEffect } from 'react';

/**
 * CustomDropdown
 * A sleek, dark-themed custom dropdown component for Turnitos.
 * Replaces native OS <select> popups with fully styled dark UI.
 */
export default function CustomDropdown({
    options = [], // [{ value, label, icon, badge }] or [strings/numbers]
    value,
    onChange,
    placeholder = 'Seleccionar...',
    disabled = false,
    size = 'normal', // 'compact' | 'normal' | 'large'
    style = {},
    dropdownStyle = {},
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Normalize options into array of { value, label, icon, badge }
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
            return {
                value: opt.value !== undefined ? opt.value : opt.id,
                label: opt.label !== undefined ? opt.label : (opt.name || String(opt.value)),
                icon: opt.icon || null,
                badge: opt.badge || null
            };
        }
        return {
            value: opt,
            label: typeof opt === 'number' ? `${opt} Horas` : String(opt),
            icon: null,
            badge: null
        };
    });

    const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const isCompact = size === 'compact';
    const isLarge = size === 'large';

    const paddingY = isCompact ? '4px' : isLarge ? '12px' : '8px';
    const paddingX = isCompact ? '8px' : isLarge ? '16px' : '12px';
    const fontSize = isCompact ? '12.5px' : isLarge ? '14.5px' : '13.5px';

    return (
        <div
            ref={containerRef}
            className={`custom-dark-dropdown ${className}`}
            style={{
                position: 'relative',
                display: 'inline-block',
                width: '100%',
                userSelect: 'none',
                fontFamily: 'inherit',
                ...style
            }}
        >
            {/* Dropdown Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(prev => !prev)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: `${paddingY} ${paddingX}`,
                    background: 'var(--bg-main, #141414)',
                    border: isOpen ? '1.5px solid var(--primary-paddle, #84CC16)' : '1.5px solid var(--border, #2A2A2A)',
                    borderRadius: isCompact ? '7px' : '10px',
                    color: selectedOption ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #888888)',
                    fontSize: fontSize,
                    fontWeight: '700',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: isOpen ? '0 0 0 3px rgba(132, 204, 22, 0.15)' : 'none',
                    opacity: disabled ? 0.6 : 1
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption?.icon && <span>{selectedOption.icon}</span>}
                    <span>{selectedOption ? selectedOption.label : placeholder}</span>
                    {selectedOption?.badge && (
                        <span style={{
                            fontSize: '10px',
                            background: 'rgba(132, 204, 22, 0.15)',
                            color: 'var(--primary-paddle, #84CC16)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: '800'
                        }}>
                            {selectedOption.badge}
                        </span>
                    )}
                </div>

                <span style={{
                    fontSize: '10px',
                    color: isOpen ? 'var(--primary-paddle, #84CC16)' : 'var(--text-secondary, #888)',
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    lineHeight: 1
                }}>
                    ▼
                </span>
            </button>

            {/* Dropdown Menu Popup */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        background: 'var(--bg-card, #1A1A1A)',
                        border: '1.5px solid var(--border, #333333)',
                        borderRadius: '10px',
                        padding: '4px',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        backdropFilter: 'blur(12px)',
                        ...dropdownStyle
                    }}
                >
                    {normalizedOptions.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted, #777)', textAlign: 'center' }}>
                            Sin opciones disponibles
                        </div>
                    ) : (
                        normalizedOptions.map((opt, idx) => {
                            const isSelected = String(opt.value) === String(value);
                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        padding: `${isCompact ? '6px 8px' : '8px 12px'}`,
                                        borderRadius: '7px',
                                        background: isSelected ? 'rgba(132, 204, 22, 0.18)' : 'transparent',
                                        color: isSelected ? 'var(--primary-paddle, #84CC16)' : 'var(--text-primary, #FFFFFF)',
                                        fontSize: fontSize,
                                        fontWeight: isSelected ? '800' : '600',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease',
                                        marginBottom: idx === normalizedOptions.length - 1 ? 0 : '2px'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {opt.icon && <span>{opt.icon}</span>}
                                        <span>{opt.label}</span>
                                    </div>

                                    {isSelected && (
                                        <span style={{ fontSize: '11px', color: 'var(--primary-paddle, #84CC16)', fontWeight: '900' }}>
                                            ✓
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
