import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, X } from 'lucide-react';
import MonthCalendar from './MonthCalendar';

const VISIBLE_DAYS = 7;

export default function Calendar({ selectedDate, onDateSelect, sportColor = '#00E676', maxDays = 30, specialDays = [], isDateClosed }) {
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

    // Total bookable days (today included), as configured by the business
    const totalDays = Math.min(Math.max(Number(maxDays) || 7, 1), 90);
    const count = Math.min(totalDays, VISIBLE_DAYS);
    const hasMore = totalDays > VISIBLE_DAYS;
    const dates = Array.from({ length: count }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const isSelectedOutsideStrip = Boolean(selectedDate) && !dates.some(d => d.toDateString() === selectedDate.toDateString());

    useEffect(() => {
        const onResize = () => setIsNarrow(window.innerWidth < 640);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!isMonthOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setIsMonthOpen(false); };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [isMonthOpen]);

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${count + (hasMore ? 1 : 0)}, minmax(0, 1fr))`,
                gap: isNarrow ? '5px' : '8px',
                textAlign: 'center'
            }}>
                {dates.map((date) => {
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const dayName = days[date.getDay()];
                    const dayNumber = date.getDate();

                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const special = (specialDays || []).find(sd => sd.date === dateStr);
                    const isClosed = typeof isDateClosed === 'function' && isDateClosed(date);

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => { if (!isClosed) onDateSelect(date); }}
                            disabled={isClosed}
                            aria-label={isClosed ? `${dayName} ${dayNumber}: cerrado` : undefined}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: isNarrow ? '10px 2px 8px 2px' : '10px 4px 8px 4px',
                                minWidth: 0,
                                borderRadius: isNarrow ? '14px' : '16px',
                                border: isSelected ? 'none' : '1px solid var(--border, transparent)',
                                backgroundColor: isSelected ? sportColor : 'transparent',
                                color: isSelected ? '#fff' : 'var(--text-primary)',
                                cursor: isClosed ? 'not-allowed' : 'pointer',
                                opacity: isClosed ? 0.4 : 1,
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? `0 8px 16px ${sportColor}40` : 'none',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected && !isClosed) {
                                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: '500', opacity: isSelected ? 0.9 : 0.6, marginBottom: '2px' }}>
                                {dayName}
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                {dayNumber}
                            </span>

                            {/* Badge for Special Days — Discount/Promo */}
                            {special && special.type === 'special_price' && (
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: '800',
                                    background: isSelected
                                        ? 'rgba(255,255,255,0.95)'
                                        : 'linear-gradient(135deg, #10b981, #059669)',
                                    color: isSelected ? '#059669' : '#ffffff',
                                    padding: '2px 6px',
                                    borderRadius: '20px',
                                    marginTop: '4px',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.3',
                                    textTransform: 'uppercase',
                                    boxShadow: isSelected ? 'none' : '0 2px 6px rgba(16,185,129,0.35)',
                                    animation: 'badgePulse 2s ease-in-out infinite',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {special.priceMode === 'discount_percent' && special.priceVal ? `${special.priceVal}% OFF` : special.priceMode === 'fixed' ? '💰 OFERTA' : '🔥 PROMO'}
                                </span>
                            )}

                            {/* Badge for Closed / Holiday */}
                            {isClosed && !(special && (special.type === 'closed' || special.type === 'holiday')) && (
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: '700',
                                    color: 'var(--text-secondary)',
                                    marginTop: '3px',
                                    lineHeight: '1.2',
                                    textTransform: 'uppercase'
                                }}>
                                    Cerrado
                                </span>
                            )}

                            {special && (special.type === 'closed' || special.type === 'holiday') && (
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: '700',
                                    color: isSelected ? 'rgba(255,255,255,0.8)' : '#ef4444',
                                    opacity: 0.9,
                                    marginTop: '3px',
                                    lineHeight: '1.2',
                                    letterSpacing: '0.2px'
                                }}>
                                    {special.type === 'holiday' ? '🎉' : '✕'}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Opens the full month calendar (only when the business allows more than 7 days ahead) */}
                {hasMore && (
                    <button
                        type="button"
                        onClick={() => setIsMonthOpen(true)}
                        aria-label={isSelectedOutsideStrip
                            ? `Fecha elegida: ${days[selectedDate.getDay()]} ${selectedDate.getDate()}. Abrir calendario`
                            : 'Ver más fechas en el calendario'}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: isNarrow ? '10px 2px 8px 2px' : '10px 4px 8px 4px',
                            minWidth: 0,
                            borderRadius: isNarrow ? '14px' : '16px',
                            border: isSelectedOutsideStrip ? 'none' : `1.5px dashed ${sportColor}`,
                            backgroundColor: isSelectedOutsideStrip ? sportColor : `${sportColor}12`,
                            color: isSelectedOutsideStrip ? '#fff' : sportColor,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelectedOutsideStrip ? `0 8px 16px ${sportColor}40` : 'none'
                        }}
                    >
                        {isSelectedOutsideStrip ? (
                            <>
                                <span style={{ fontSize: '11px', fontWeight: '500', opacity: 0.9, marginBottom: '2px' }}>
                                    {days[selectedDate.getDay()]}
                                </span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                    {selectedDate.getDate()}
                                </span>
                                <CalendarDays size={12} style={{ marginTop: '3px', opacity: 0.9 }} />
                            </>
                        ) : (
                            <>
                                <CalendarDays size={isNarrow ? 18 : 20} strokeWidth={2.2} />
                                <span style={{ fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>
                                    Más
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {isMonthOpen && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Elegí una fecha"
                    onClick={() => setIsMonthOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: isNarrow ? 'flex-end' : 'center',
                        justifyContent: 'center',
                        padding: isNarrow ? 0 : '16px',
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: isNarrow ? '100%' : '420px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            borderRadius: isNarrow ? '24px 24px 0 0' : '24px',
                            padding: isNarrow ? '16px 16px calc(20px + env(safe-area-inset-bottom))' : '20px 24px 24px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                            border: '1px solid var(--border)',
                            animation: 'slideUp 0.25s ease'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                Elegí una fecha
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsMonthOpen(false)}
                                aria-label="Cerrar"
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <MonthCalendar
                            selectedDate={selectedDate}
                            onDateSelect={(date) => {
                                onDateSelect(date);
                                setIsMonthOpen(false);
                            }}
                            sportColor={sportColor}
                            maxDays={totalDays - 1}
                            isDateClosed={isDateClosed}
                            specialDays={specialDays}
                            limitNavigation
                        />

                        <p style={{ margin: '14px 0 0', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Podés reservar hasta {totalDays} días por adelantado
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
