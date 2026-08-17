import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * DateRangePicker Component
 * Allows users to select preset or custom date ranges
 */
export default function DateRangePicker({ onRangeChange }) {
    const [selectedPreset, setSelectedPreset] = useState('all');
    const [showCustom, setShowCustom] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const presets = [
        { id: 'all', label: 'Histórico (Todo)' },
        { id: 'month', label: 'Este Mes' },
        { id: '7d', label: 'Últimos 7 días' },
        { id: 'today', label: 'Hoy' },
        { id: 'custom', label: 'Personalizado 📅' }
    ];

    const handlePresetClick = (preset) => {
        setSelectedPreset(preset.id);

        if (preset.id === 'custom') {
            setShowCustom(true);
            return;
        }

        setShowCustom(false);
        const now = new Date();

        if (preset.id === 'all') {
            onRangeChange({ preset: 'all', start: null, end: null });
            return;
        }

        if (preset.id === 'today') {
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            onRangeChange({ preset: 'today', start: todayStr, end: todayStr });
            return;
        }

        if (preset.id === 'month') {
            const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const lastDayObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const lastDay = `${lastDayObj.getFullYear()}-${String(lastDayObj.getMonth() + 1).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
            onRangeChange({ preset: 'month', start: firstDay, end: lastDay });
            return;
        }

        if (preset.id === '7d') {
            const past7 = new Date();
            past7.setDate(past7.getDate() - 7);
            const startStr = `${past7.getFullYear()}-${String(past7.getMonth() + 1).padStart(2, '0')}-${String(past7.getDate()).padStart(2, '0')}`;
            const future7 = new Date();
            future7.setDate(future7.getDate() + 14);
            const endStr = `${future7.getFullYear()}-${String(future7.getMonth() + 1).padStart(2, '0')}-${String(future7.getDate()).padStart(2, '0')}`;
            onRangeChange({ preset: '7d', start: startStr, end: endStr });
            return;
        }
    };

    const handleApplyCustom = () => {
        if (!customStart) return;
        onRangeChange({ preset: 'custom', start: customStart, end: customEnd || customStart });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {presets.map(preset => (
                    <motion.button
                        key={preset.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePresetClick(preset)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: selectedPreset === preset.id
                                ? '1px solid var(--primary-paddle)'
                                : '1px solid var(--border)',
                            background: selectedPreset === preset.id
                                ? 'rgba(0, 230, 118, 0.15)'
                                : 'var(--bg-card)',
                            color: selectedPreset === preset.id
                                ? 'var(--primary-paddle)'
                                : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: selectedPreset === preset.id ? '700' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {preset.label}
                    </motion.button>
                ))}
            </div>

            {showCustom && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '12px'
                }}>
                    <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '12px'
                        }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>hasta</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '12px'
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleApplyCustom}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--primary-paddle)',
                            color: '#000',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '11px'
                        }}
                    >
                        Aplicar
                    </button>
                </div>
            )}
        </div>
    );
}
