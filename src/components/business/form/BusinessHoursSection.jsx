import React from 'react';

export default function BusinessHoursSection({
    formData,
    setFormData,
    showHours,
    setShowHours
}) {
    const dayLabels = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
        thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
    };

    return (
        <section>
            <div
                onClick={() => setShowHours(!showHours)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginBottom: showHours ? '16px' : '0'
                }}
            >
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                    Horarios de Atención
                </h3>
                <span style={{ fontSize: '24px', color: 'var(--text-secondary)' }}>
                    {showHours ? '−' : '+'}
                </span>
            </div>

            {showHours && (
                <>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary-paddle)' }}>
                        💡 <strong>Horarios nocturnos:</strong> Para negocios que operan después de medianoche, usa el formato 24+. Ejemplo: de 22:00 a 26:00 (2 AM del día siguiente). Los turnos se agruparán bajo el día de apertura.
                    </p>

                    {/* Interval Selector */}
                    <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Intervalo de Turnos
                        </label>
                        <select
                            value={formData.hours?.interval || 60}
                            onChange={(e) => {
                                const newHours = { ...formData.hours, interval: parseInt(e.target.value) };
                                setFormData({ ...formData, hours: newHours });
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '14px'
                            }}
                        >
                            <option value={30}>Cada 30 minutos</option>
                            <option value={60}>Cada 60 minutos (1 hora)</option>
                            <option value={90}>Cada 90 minutos (1.5 horas)</option>
                        </select>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                            Define la duración de cada bloque de reserva visible para los clientes.
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                            const schedule = formData.hours[day] || { open: '08:00', close: '22:00', isOpen: true };

                            return (
                                <div key={day} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-main)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ width: '100px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                        {dayLabels[day]}
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '100px' }}>
                                        <input
                                            type="checkbox"
                                            checked={schedule.isOpen}
                                            onChange={(e) => {
                                                const newHours = { ...formData.hours };
                                                if (!newHours[day]) newHours[day] = { open: '08:00', close: '22:00', isOpen: true };
                                                newHours[day] = { ...newHours[day], isOpen: e.target.checked };
                                                setFormData({ ...formData, hours: newHours });
                                            }}
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary-paddle)' }}
                                        />
                                        <span style={{ fontSize: '14px', color: schedule.isOpen ? 'var(--primary-paddle)' : 'var(--text-secondary)', fontWeight: schedule.isOpen ? '600' : '400' }}>
                                            {schedule.isOpen ? 'Abierto' : 'Cerrado'}
                                        </span>
                                    </label>

                                    {schedule.isOpen && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                            {(schedule.ranges || [{ open: schedule.open, close: schedule.close }]).map((range, index) => (
                                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <select
                                                        value={range.open}
                                                        onChange={(e) => {
                                                            const newHours = { ...formData.hours };
                                                            const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                            currentRanges[index] = { ...currentRanges[index], open: e.target.value };

                                                            newHours[day] = {
                                                                ...newHours[day],
                                                                ranges: currentRanges,
                                                                open: index === 0 ? e.target.value : newHours[day].open
                                                            };
                                                            setFormData({ ...formData, hours: newHours });
                                                        }}
                                                        style={{
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            backgroundColor: 'var(--bg-card)',
                                                            color: 'var(--text-primary)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {Array.from({ length: 30 }, (_, i) => {
                                                            const hour = i.toString().padStart(2, '0');
                                                            return (
                                                                <React.Fragment key={i}>
                                                                    <option value={`${hour}:00`}>{`${hour}:00`}</option>
                                                                    <option value={`${hour}:30`}>{`${hour}:30`}</option>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </select>
                                                    <span style={{ color: 'var(--text-secondary)' }}>a</span>
                                                    <select
                                                        value={range.close}
                                                        onChange={(e) => {
                                                            const newHours = { ...formData.hours };
                                                            const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                            currentRanges[index] = { ...currentRanges[index], close: e.target.value };

                                                            newHours[day] = {
                                                                ...newHours[day],
                                                                ranges: currentRanges,
                                                                close: index === 0 ? e.target.value : newHours[day].close
                                                            };
                                                            setFormData({ ...formData, hours: newHours });
                                                        }}
                                                        style={{
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border)',
                                                            backgroundColor: 'var(--bg-card)',
                                                            color: 'var(--text-primary)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {Array.from({ length: 30 }, (_, i) => {
                                                            const hour = i.toString().padStart(2, '0');
                                                            return (
                                                                <React.Fragment key={i}>
                                                                    <option value={`${hour}:00`}>{`${hour}:00`}</option>
                                                                    <option value={`${hour}:30`}>{`${hour}:30`}</option>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </select>
                                                    {(schedule.ranges || []).length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newHours = { ...formData.hours };
                                                                const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                                currentRanges.splice(index, 1);
                                                                newHours[day] = { ...newHours[day], ranges: currentRanges };
                                                                setFormData({ ...formData, hours: newHours });
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--error, #ef4444)',
                                                                cursor: 'pointer',
                                                                fontSize: '18px',
                                                                padding: '0 4px'
                                                            }}
                                                            title="Eliminar horario"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newHours = { ...formData.hours };
                                                    const currentRanges = [...(schedule.ranges || [{ open: schedule.open, close: schedule.close }])];
                                                    currentRanges.push({ open: '17:00', close: '21:00' });
                                                    newHours[day] = { ...newHours[day], ranges: currentRanges };
                                                    setFormData({ ...formData, hours: newHours });
                                                }}
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--primary-paddle)',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    marginTop: '4px'
                                                }}
                                            >
                                                + Agregar Horario (Corte)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
