import React, { useState } from 'react';
import { formatDisplayDate } from '../utils/dateUtils';

export default function DashboardStats({ bookings, viewMode = 'month', currentDate = new Date(), isMobile, theme, toggleTheme }) {
    const [isExpanded, setIsExpanded] = useState(!isMobile);

    // Helper to format date as YYYY-MM-DD for comparison
    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getFilteredBookings = () => {
        return bookings.filter(b => {
            let bDate;
            if (b.date.includes('/')) {
                const [d, m, y] = b.date.split('/');
                bDate = new Date(y, m - 1, d);
            } else {
                // Assume YYYY-MM-DD
                const [y, m, d] = b.date.split('-');
                bDate = new Date(y, m - 1, d);
            }

            if (viewMode === 'day') {
                return formatDateKey(bDate) === formatDateKey(currentDate);
            } else if (viewMode === 'week') {
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - 3);
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(currentDate);
                weekEnd.setDate(weekEnd.getDate() + 3);
                weekEnd.setHours(23, 59, 59, 999);
                return bDate >= weekStart && bDate <= weekEnd;
            } else {
                // month
                return bDate.getMonth() === currentDate.getMonth() && bDate.getFullYear() === currentDate.getFullYear();
            }
        });
    };

    const filteredBookings = getFilteredBookings();

    const stats = {
        pending: filteredBookings.filter(b => b.status === 'pending').length,
        deposit_paid: filteredBookings.filter(b => b.status === 'deposit_paid').length,
        confirmed: filteredBookings.filter(b => b.status === 'confirmed').length,
        completed: filteredBookings.filter(b => b.status === 'completed' || b.status === 'attended').length,
    };

    const getPeriodLabel = () => {
        if (viewMode === 'day') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = formatDateKey(currentDate) === formatDateKey(today);
            return isToday ? 'Hoy' : formatDisplayDate(currentDate);
        } else if (viewMode === 'week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - 3);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 3);

            // If same month
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `Semana (${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('es-ES', { month: 'short' })})`;
            }
            return `Semana (${weekStart.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('es-ES', { month: 'short' })})`;
        } else {
            return formatDisplayDate(currentDate);
        }
    };

    const StatCard = ({ title, value, subtext, color, icon }) => (
        <div style={{
            background: isMobile ? 'var(--bg-main)' : 'var(--bg-card)',
            padding: isMobile ? '16px' : '20px',
            borderRadius: '16px',
            boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid var(--border)',
            flex: '1 1 150px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: isMobile ? '140px' : '180px'
        }}>
            <div style={{
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '40px' : '48px',
                borderRadius: '12px',
                backgroundColor: `${color}20`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '20px' : '24px'
            }}>
                {icon}
            </div>
            <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '11px' : '13px', marginBottom: '2px' }}>{title}</p>
                <h3 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{value}</h3>
            </div>
        </div>
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '0',
            background: isMobile ? 'var(--bg-card)' : 'transparent',
            padding: isMobile ? '16px' : '0',
            borderRadius: isMobile ? '16px' : '0',
            border: isMobile ? '1px solid var(--border)' : 'none',
            boxShadow: isMobile ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
        }}>
            <div
                onClick={() => isMobile && setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: isMobile ? 'pointer' : 'default'
                }}
            >
                <h3 style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0,
                    textTransform: 'capitalize',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ fontSize: '18px' }}>📊</span> Resumen {getPeriodLabel()}
                </h3>
                {isMobile && (
                    <div style={{
                        background: 'var(--bg-main)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'var(--primary)'
                    }}>
                        {isExpanded ? 'Ocultar ▲' : 'Ver más ▼'}
                    </div>
                )}
            </div>

            {(isExpanded || !isMobile) && (
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <StatCard
                        title="Pendientes"
                        value={stats.pending}
                        color="#9CA3AF"
                        icon="⏳"
                    />
                    <StatCard
                        title="Señados"
                        value={stats.deposit_paid}
                        color="#F59E0B"
                        icon="🎟️"
                    />
                    <StatCard
                        title="Confirmados"
                        value={stats.confirmed}
                        color="#2979FF"
                        icon="✅"
                    />
                    <StatCard
                        title="Finalizados"
                        value={stats.completed}
                        color="#00E676"
                        icon="🏁"
                    />
                </div>
            )}
        </div>
    );
}
