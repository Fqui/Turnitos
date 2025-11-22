import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * DateRangePicker Component
 * Allows users to select preset or custom date ranges
 */
export default function DateRangePicker({ onRangeChange }) {
    const [selectedPreset, setSelectedPreset] = useState('30d');

    const presets = [
        { id: '7d', label: '7 días', days: 7 },
        { id: '30d', label: '30 días', days: 30 },
        { id: '90d', label: '90 días', days: 90 },
        { id: 'year', label: '1 año', days: 365 }
    ];

    const handlePresetClick = (preset) => {
        setSelectedPreset(preset.id);

        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - preset.days);

        onRangeChange({ start, end });
    };

    return (
        <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
        }}>
            {presets.map(preset => (
                <motion.button
                    key={preset.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePresetClick(preset)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '12px',
                        border: selectedPreset === preset.id
                            ? '2px solid #6366f1'
                            : '1px solid var(--border)',
                        background: selectedPreset === preset.id
                            ? '#6366f120'
                            : 'var(--bg-card)',
                        color: selectedPreset === preset.id
                            ? '#6366f1'
                            : 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: selectedPreset === preset.id ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {preset.label}
                </motion.button>
            ))}
        </div>
    );
}
