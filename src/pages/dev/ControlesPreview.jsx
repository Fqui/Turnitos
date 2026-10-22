// Vista previa SOLO para desarrollo (npm run dev): controles propios (fecha, hora, desplegable)
// y el botón único, con datos de ejemplo y sin iniciar sesión. No se incluye en el build.
import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Select, TimePicker } from '../../components/common/controls';
import BookingDetailsModal from '../../components/business/BookingDetailsModal';
import ScheduleTab from '../../components/business/settings/ScheduleTab';
import { formatDisplayDate } from '../../utils/dateUtils';
import { useNotification } from '../../contexts/NotificationContext';

const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmado', deposit_paid: 'Seña pagada', cancelled: 'Cancelado' };

const DEMO_BIZ = {
    id: 'demo-biz',
    name: 'Barbería Demo',
    slug: 'demo',
    business_type: 'services',
    category: 'barberia',
    services: [
        { id: 's1', name: 'Corte clásico', duration: 30, price: 8000 },
        { id: 's2', name: 'Corte + barba', duration: 60, price: 12000 },
        { id: 's3', name: 'Color', duration: 90, price: 20000 }
    ],
    specialists: [
        { id: 'p1', name: 'Juan' },
        { id: 'p2', name: 'Mica' }
    ]
};

const DEMO_BOOKING = {
    id: 'demo-booking',
    business_id: 'demo-biz',
    service_id: 's2',
    specialist_id: 'p1',
    date: '2026-10-22',
    time: '17:30',
    duration: 60,
    status: 'confirmed',
    customer_name: 'Lucía Pérez',
    customer_phone: '3804123456',
    total_price: 12000,
    price: 12000
};

const DEMO_HOURS = {
    monday: { isOpen: true, open: '09:00', close: '20:00' },
    tuesday: { isOpen: true, isSplit: true, open: '09:00', breakStart: '13:00', breakEnd: '16:00', close: '20:00' },
    wednesday: { isOpen: true, open: '09:00', close: '20:00' },
    thursday: { isOpen: true, open: '09:00', close: '20:00' },
    friday: { isOpen: true, open: '09:00', close: '21:00' },
    saturday: { isOpen: true, open: '10:00', close: '14:00' },
    sunday: { isOpen: false }
};

const section = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'grid', gap: '14px' };
const h2 = { fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' };
const row = { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' };

export default function ControlesPreview() {
    const { showToast } = useNotification();
    const [theme, setTheme] = useState('dark');
    const [brand, setBrand] = useState('#8B5CF6');
    const [date, setDate] = useState('2026-10-22');
    const [time, setTime] = useState('17:30');
    const [service, setService] = useState('s2');
    const [showBooking, setShowBooking] = useState(false);
    const [formData, setFormData] = useState({ hours: DEMO_HOURS });
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '20px 16px 80px' }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', display: 'grid', gap: '16px' }}>
                <div style={{ ...row, justifyContent: 'space-between' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '800' }}>Controles y botones</h1>
                    <Button variant="secondary" size="sm" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
                        Tema {theme === 'dark' ? 'claro' : 'oscuro'}
                    </Button>
                </div>

                <div style={section} data-preview="controles">
                    <h2 style={h2}>Fecha, hora y desplegable</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px' }}>
                        <DatePicker aria-label="Día" title="Día del turno" value={date} onChange={setDate} />
                        <TimePicker aria-label="Horario" title="Horario del turno" value={time} onChange={setTime} />
                        <Select
                            aria-label="Servicio"
                            title="Servicio"
                            value={service}
                            onChange={setService}
                            options={DEMO_BIZ.services.map(s => ({ value: s.id, label: s.name, hint: `${s.duration} min` }))}
                        />
                    </div>
                    <Button onClick={() => setShowBooking(true)}>Abrir “Detalle del turno”</Button>
                </div>

                <div style={section} data-preview="botones">
                    <h2 style={h2}>Botón único</h2>
                    <div style={row}>
                        <Button>Guardar</Button>
                        <Button variant="secondary">Cancelar</Button>
                        <Button variant="outline">Editar</Button>
                        <Button variant="ghost">Ver más</Button>
                        <Button variant="danger">Eliminar</Button>
                        <Button variant="danger-soft">Cancelar turno</Button>
                    </div>
                    <div style={row}>
                        <Button size="sm">Chico</Button>
                        <Button size="md">Mediano</Button>
                        <Button size="lg">Grande</Button>
                        <Button loading>Guardando</Button>
                        <Button disabled>Deshabilitado</Button>
                    </div>
                    <div style={row}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Color de marca:</span>
                        {['#8B5CF6', '#3ECF8E', '#F59E0B', '#0EA5E9', '#EC4899', '#FDE047', '#111827'].map(c => (
                            <button
                                key={c}
                                type="button"
                                aria-label={`Usar ${c}`}
                                onClick={() => setBrand(c)}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: brand === c ? '3px solid var(--text-primary)' : '1px solid var(--border)', cursor: 'pointer' }}
                            />
                        ))}
                    </div>
                    <div style={row}>
                        <Button color={brand}>Reservar</Button>
                        <Button color={brand} variant="outline">Ver horarios</Button>
                        <Button color={brand} size="lg" fullWidth>Confirmar turno</Button>
                    </div>
                </div>

                <div style={section} data-preview="horarios">
                    <h2 style={h2}>Ajustes · Horarios</h2>
                    <ScheduleTab
                        formData={formData}
                        handleInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                        handleSave={() => showToast('Vista previa: no se guarda nada', 'info')}
                        saving={false}
                        isMobile={isMobile}
                    />
                </div>
            </div>

            {showBooking && (
                <BookingDetailsModal
                    isOpen={showBooking}
                    onClose={() => setShowBooking(false)}
                    isMobile={isMobile}
                    booking={DEMO_BOOKING}
                    businesses={[DEMO_BIZ]}
                    selectedBusinessId={DEMO_BIZ.id}
                    onAction={() => showToast('Vista previa: no se guarda nada', 'info')}
                    formatDisplayDate={formatDisplayDate}
                    getStatusLabel={(s) => STATUS_LABELS[s] || s}
                />
            )}
        </div>
    );
}
