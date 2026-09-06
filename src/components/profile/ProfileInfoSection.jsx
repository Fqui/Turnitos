import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { parseAmenity } from '../common/AmenityIcon';

export default function ProfileInfoSection({
    business,
    primaryColor
}) {
    const dayNames = {
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado',
        sunday: 'Domingo'
    };

    const renderBusinessHours = () => {
        if (!business?.hours) {
            return <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No hay horarios especificados.</p>;
        }

        let hours = business.hours;
        if (typeof hours === 'string') {
            try {
                hours = JSON.parse(hours);
            } catch (e) {
                return (
                    <div style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Horario</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{hours}</div>
                    </div>
                );
            }
        }

        // Object format (per-day schedule)
        if (typeof hours === 'object' && !hours.weekday) {
            const scheduleGroups = {};

            Object.entries(dayNames).forEach(([day, label]) => {
                const schedule = hours[day];
                const isValidTime = (t) => t && t !== '00:00';
                const isEffectiveOpen = schedule && (
                    schedule.isOpen === true ||
                    (schedule.isSplit && schedule.isOpen !== false) ||
                    (schedule.isOpen !== false && isValidTime(schedule.open) && isValidTime(schedule.close))
                );

                let scheduleKey;
                if (!isEffectiveOpen) {
                    scheduleKey = 'CLOSED';
                } else if (schedule.isSplit) {
                    const breakStart = schedule.breakStart || '13:00';
                    const breakEnd = schedule.breakEnd || '16:00';
                    scheduleKey = `${schedule.open}-${breakStart}|${breakEnd}-${schedule.close}`;
                } else {
                    scheduleKey = `${schedule.open}-${schedule.close}`;
                }

                if (!scheduleGroups[scheduleKey]) {
                    scheduleGroups[scheduleKey] = {
                        days: [],
                        schedule: schedule
                    };
                }
                scheduleGroups[scheduleKey].days.push(label);
            });

            return Object.entries(scheduleGroups).map(([key, group], index) => {
                if (key === 'CLOSED') {
                    return (
                        <div key={index} style={{ fontSize: '13px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                {group.days.join(', ')}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Cerrado
                            </div>
                        </div>
                    );
                }

                const schedule = group.schedule;
                let timeDisplay;
                if (schedule.isSplit) {
                    const breakStart = schedule.breakStart || '13:00';
                    const breakEnd = schedule.breakEnd || '16:00';
                    timeDisplay = `${schedule.open} a ${breakStart} | ${breakEnd} a ${schedule.close}`;
                } else {
                    timeDisplay = `${schedule.open} a ${schedule.close}`;
                }

                return (
                    <div key={index} style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {group.days.join(', ')}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                            {timeDisplay}
                        </div>
                    </div>
                );
            });
        }

        // Legacy format (weekday / weekend)
        if (typeof hours === 'object' && hours.weekday) {
            return (
                <>
                    <div style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Lunes a Viernes</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{hours.weekday}</div>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Sábado y Domingo</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{hours.weekend}</div>
                    </div>
                </>
            );
        }

        return <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No hay horarios especificados.</p>;
    };

    return (
        <section style={{ marginBottom: '30px', marginTop: '40px', animation: 'slideUp 0.4s ease' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Información General
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                {/* Map */}
                {business.latitude && business.longitude && (
                    <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', height: '300px', position: 'relative' }}>
                        <MapContainer
                            center={[business.latitude, business.longitude]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            dragging={false}
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[business.latitude, business.longitude]} />
                        </MapContainer>
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                position: 'absolute',
                                bottom: '10px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                padding: '10px 24px',
                                width: 'auto',
                                backgroundColor: primaryColor,
                                color: '#fff',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '14px',
                                textAlign: 'center',
                                borderRadius: '10px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                zIndex: 1000
                            }}
                        >
                            🗺️ Cómo llegar
                        </a>
                    </div>
                )}

                {/* Amenities & Hours Combined */}
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    padding: '20px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    {/* Amenities - Top Half */}
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                            Comodidades
                        </h4>
                        {business.amenities && business.amenities.length > 0 ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '12px',
                                fontSize: '14px'
                            }}>
                                {business.amenities.map((rawAmenity, index) => {
                                    const parsed = parseAmenity(rawAmenity);
                                    if (!parsed.name) return null;
                                    return (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                            <span style={{ fontSize: '16px' }}>✓</span>
                                            <span>{parsed.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay comodidades especificadas.</p>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>

                    {/* Business Hours - Bottom Half */}
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                            🕐 Horarios de Atención
                        </h4>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {renderBusinessHours()}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
