import React from 'react';

const daysTranslation = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
};

const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ScheduleTab({
    formData,
    handleInputChange,
    handleSave,
    saving,
    inputStyle,
    saveButtonStyle,
    isMobile
}) {
    return (
        <div style={{ display: 'grid', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>Días y Horarios de Atención</h3>
            <div style={{ background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {orderedDays.map((day, index) => {
                    const dayConfig = formData.hours?.[day] || {};
                    const isOpen = dayConfig.isOpen !== false; // Default to open if undefined
                    const isSplit = !!dayConfig.isSplit;

                    return (
                        <div key={day} style={{
                            borderBottom: index < orderedDays.length - 1 ? '1px solid var(--border)' : 'none',
                            background: isOpen ? 'transparent' : 'rgba(0,0,0,0.02)',
                            padding: '16px 20px'
                        }}>
                            {/* Day Toggle Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: isOpen ? '16px' : '0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="checkbox"
                                        id={`toggle-${day}`}
                                        checked={isOpen}
                                        onChange={(e) => {
                                            const newHours = { ...formData.hours };
                                            if (!newHours[day]) newHours[day] = {};
                                            newHours[day] = {
                                                open: newHours[day].open || '08:00',
                                                close: newHours[day].close || '23:00',
                                                ...newHours[day],
                                                isOpen: e.target.checked
                                            };
                                            handleInputChange('hours', newHours);
                                        }}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-paddle)' }}
                                    />
                                    <label htmlFor={`toggle-${day}`} style={{ fontWeight: '600', color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                                        {daysTranslation[day]}
                                    </label>
                                </div>

                                {/* Split Shift Toggle */}
                                {isOpen && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id={`split-${day}`}
                                            checked={isSplit}
                                            onChange={(e) => {
                                                const newHours = { ...formData.hours };
                                                const newIsSplit = e.target.checked;
                                                newHours[day] = {
                                                    ...newHours[day],
                                                    isSplit: newIsSplit,
                                                    open: newIsSplit ? (dayConfig.open || '09:00') : (dayConfig.open || '09:00'),
                                                    close: newIsSplit ? (dayConfig.close || '20:00') : (dayConfig.close || '20:00'),
                                                    breakStart: newIsSplit ? '13:00' : null,
                                                    breakEnd: newIsSplit ? '16:00' : null
                                                };
                                                handleInputChange('hours', newHours);
                                            }}
                                            style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'var(--primary-paddle)' }}
                                        />
                                        <label htmlFor={`split-${day}`} style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                            Doble Turno
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Time Inputs */}
                            {isOpen && (
                                <div style={{ paddingLeft: isMobile ? '0' : '30px', animation: 'fadeIn 0.2s' }}>
                                    {!isSplit ? (
                                        // Continuous Shift Mode
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '60px' }}>Corrido:</span>
                                            <input
                                                type="time"
                                                value={dayConfig.open || '08:00'}
                                                onChange={(e) => {
                                                    const newHours = { ...formData.hours };
                                                    newHours[day] = { ...newHours[day], open: e.target.value };
                                                    handleInputChange('hours', newHours);
                                                }}
                                                style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                            <input
                                                type="time"
                                                value={dayConfig.close || '23:00'}
                                                onChange={(e) => {
                                                    const newHours = { ...formData.hours };
                                                    newHours[day] = { ...newHours[day], close: e.target.value };
                                                    handleInputChange('hours', newHours);
                                                }}
                                                style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                            />
                                        </div>
                                    ) : (
                                        // Split Shift Mode
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {/* Shift 1 */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '60px' }}>Turno 1:</span>
                                                <input
                                                    type="time"
                                                    value={dayConfig.open || '09:00'}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.hours };
                                                        newHours[day] = { ...newHours[day], open: e.target.value };
                                                        handleInputChange('hours', newHours);
                                                    }}
                                                    style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                />
                                                <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                                <input
                                                    type="time"
                                                    value={dayConfig.breakStart || '13:00'}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.hours };
                                                        newHours[day] = { ...newHours[day], breakStart: e.target.value };
                                                        handleInputChange('hours', newHours);
                                                    }}
                                                    style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                />
                                            </div>

                                            {/* Shift 2 */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '60px' }}>Turno 2:</span>
                                                <input
                                                    type="time"
                                                    value={dayConfig.breakEnd || '16:00'}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.hours };
                                                        newHours[day] = { ...newHours[day], breakEnd: e.target.value };
                                                        handleInputChange('hours', newHours);
                                                    }}
                                                    style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                />
                                                <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                                <input
                                                    type="time"
                                                    value={dayConfig.close || '20:00'}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.hours };
                                                        newHours[day] = { ...newHours[day], close: e.target.value };
                                                        handleInputChange('hours', newHours);
                                                    }}
                                                    style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <button
                type="button"
                onClick={() => {
                    const normalizedHours = {};
                    orderedDays.forEach(day => {
                        const current = formData.hours?.[day] || {};
                        normalizedHours[day] = {
                            isOpen: current.isOpen !== false,
                            isSplit: !!current.isSplit,
                            open: current.open || '08:00',
                            close: current.close || '20:00',
                            breakStart: current.isSplit ? (current.breakStart || '13:00') : null,
                            breakEnd: current.isSplit ? (current.breakEnd || '16:00') : null
                        };
                    });
                    if (formData.special_days) {
                        normalizedHours.special_days = formData.special_days;
                    }
                    handleInputChange('hours', normalizedHours);
                    handleSave({ hours: normalizedHours });
                }}
                style={saveButtonStyle}
                disabled={saving}
            >
                {saving ? 'Guardando...' : 'Guardar Horarios'}
            </button>
        </div>
    );
}
