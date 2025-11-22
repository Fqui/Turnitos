import React from 'react';

export default function DashboardStats({ bookings }) {
    // Calculate stats
    const today = new Date().toLocaleDateString('es-ES');
    const todaysBookings = bookings.filter(b => b.date === today && b.status !== 'cancelled');
    const totalRevenue = todaysBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    const StatCard = ({ title, value, subtext, color, icon }) => (
        <div style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)',
            flex: 1,
            minWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${color}20`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
            }}>
                {icon}
            </div>
            <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>{title}</p>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{value}</h3>
                {subtext && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
            <StatCard
                title="Reservas Hoy"
                value={todaysBookings.length}
                subtext="Confirmadas"
                color="#2979FF"
                icon="📅"
            />
            <StatCard
                title="Ingresos Hoy"
                value={`$${totalRevenue.toLocaleString()}`}
                subtext="Estimado"
                color="#00E676"
                icon="💰"
            />
        </div>
    );
}
