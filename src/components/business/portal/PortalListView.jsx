import React from 'react';

export default function PortalListView({
    bookings,
    listFilters,
    setListFilters,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    isRentalBusiness,
    handleBookingClick,
    getStatusLabel,
    getStatusStyle,
    formatDisplayDate,
    isMobile
}) {
    const isBookingBlocked = (booking) => {
        return booking?.status === 'blocked' ||
            booking?.is_blocked ||
            String(booking?.customer_name || booking?.customerName || '').toUpperCase().includes('BLOQUEADO');
    };

    const getBookingRentalDetails = (booking) => {
        if (isBookingBlocked(booking)) {
            const reason = booking.notes || booking.metadata?.notes || 'Bloqueo administrativo';
            const resource = booking.services?.name || booking.courts?.name || 'Espacio completo';
            return (
                <div style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: '700', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🔒</span> <span>{resource}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                        {reason}
                    </div>
                </div>
            );
        }

        const guests = booking.guest_count || booking.guestCount || booking.metadata?.guest_count || booking.metadata?.guestCount;

        let services = [];
        const rawServices = booking.selected_services || booking.selectedServices || booking.metadata?.selected_services || booking.metadata?.selectedServices || [];
        if (Array.isArray(rawServices)) {
            services = rawServices.map(s => typeof s === 'object' && s !== null ? (s.name || s.label || s.title) : String(s)).filter(Boolean);
        } else if (typeof rawServices === 'string' && rawServices.trim()) {
            try {
                const parsed = JSON.parse(rawServices);
                if (Array.isArray(parsed)) {
                    services = parsed.map(s => typeof s === 'object' && s !== null ? (s.name || s.label || s.title) : String(s)).filter(Boolean);
                } else {
                    services = [rawServices.trim()];
                }
            } catch (e) {
                services = [rawServices.trim()];
            }
        }

        return (
            <div>
                {guests ? (
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>👥</span> <span>{guests} personas</span>
                    </div>
                ) : (
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {booking.services?.name || booking.courts?.name || booking.service || 'Alquiler del Espacio'}
                    </div>
                )}
                {services.length > 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--primary-paddle, #84CC16)', marginTop: '3px', fontWeight: '600' }}>
                        + {services.join(', ')}
                    </div>
                ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Sin adicionales
                    </div>
                )}
            </div>
        );
    };

    const getBookingFinancials = (booking) => {
        if (isBookingBlocked(booking)) {
            return (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    —
                </div>
            );
        }

        const total = Number(booking.price || booking.total_price || booking.totalPrice || 0);
        const deposit = Number(booking.deposit_amount || booking.depositAmount || booking.metadata?.deposit_amount || booking.metadata?.depositAmount || 0);

        return (
            <div>
                <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>
                    ${total > 0 ? total.toLocaleString('es-AR') : '-'}
                </div>
                {deposit > 0 ? (
                    <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700', marginTop: '2px' }}>
                        Seña: ${deposit.toLocaleString('es-AR')}
                    </div>
                ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Sin seña
                    </div>
                )}
            </div>
        );
    };

    const term = listFilters.search.toLowerCase().trim();
    const filtered = bookings.filter(booking => {
        let matchesSearch = true;
        if (term) {
            const clientName = (booking.customer_name || booking.customerName || '').toLowerCase();
            const clientPhone = (booking.customer_phone || booking.customerPhone || '').toLowerCase();
            const serviceName = (booking.services?.name || booking.courts?.name || booking.service || '').toLowerCase();
            const notes = (booking.notes || booking.metadata?.notes || '').toLowerCase();
            const guestStr = String(booking.guest_count || booking.guestCount || booking.metadata?.guest_count || booking.metadata?.guestCount || '');
            const servicesStr = JSON.stringify(booking.selected_services || booking.selectedServices || booking.metadata?.selected_services || '').toLowerCase();

            matchesSearch = clientName.includes(term) ||
                clientPhone.includes(term) ||
                serviceName.includes(term) ||
                notes.includes(term) ||
                guestStr.includes(term) ||
                servicesStr.includes(term);
        }
        const matchesStatus = listFilters.status === 'all' || booking.status === listFilters.status;
        const matchesDate = !listFilters.date || booking.date === listFilters.date;
        return matchesSearch && matchesStatus && matchesDate;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: isMobile ? 'none' : '1px solid var(--border)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
        }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: isMobile ? 0 : '10px' }}>
                {/* Filters Section */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.01)'
                }}>
                    <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        <input
                            type="text"
                            placeholder={isRentalBusiness ? "Buscar por cliente, invitados o servicios..." : "Buscar por cliente o servicio..."}
                            value={listFilters.search}
                            onChange={(e) => {
                                setListFilters(prev => ({ ...prev, search: e.target.value }));
                                setCurrentPage(1);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 38px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                fontSize: '14px',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <select
                            value={listFilters.status}
                            onChange={(e) => {
                                setListFilters(prev => ({ ...prev, status: e.target.value }));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                fontSize: '14px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendientes</option>
                            <option value="confirmed">Confirmados</option>
                            <option value="deposit_paid">Señados</option>
                            <option value="completed">Finalizados</option>
                            <option value="cancelled">Cancelados</option>
                            <option value="blocked">Bloqueados</option>
                        </select>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)'
                        }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>Fecha:</span>
                            <input
                                type="date"
                                value={listFilters.date}
                                onChange={(e) => {
                                    setListFilters(prev => ({ ...prev, date: e.target.value }));
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '10px 0',
                                    borderRadius: '0',
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '14px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        {(listFilters.search || listFilters.status !== 'all' || listFilters.date) && (
                            <button
                                onClick={() => {
                                    setListFilters({ search: '', status: 'all', date: '' });
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    color: '#ff4444',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ width: '100%' }}>
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0' }}>
                            {paginated.map((booking, index) => {
                                const isBlocked = isBookingBlocked(booking);
                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleBookingClick(booking)}
                                        style={{
                                            background: isBlocked ? 'rgba(100, 116, 139, 0.05)' : 'var(--bg-card)',
                                            padding: '16px',
                                            borderRadius: '16px',
                                            border: isBlocked ? '1px dashed rgba(100, 116, 139, 0.3)' : '1px solid var(--border)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <div>
                                                {isRentalBusiness ? (
                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                        {formatDisplayDate(booking.date)}
                                                    </span>
                                                ) : (
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{booking.time} hs</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {formatDisplayDate(booking.date)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: 'var(--radius-full)',
                                                fontSize: '10px',
                                                fontWeight: '800',
                                                letterSpacing: '0.03em',
                                                background: isBlocked ? 'rgba(100, 116, 139, 0.15)' : getStatusStyle(booking.status).bg,
                                                color: isBlocked ? '#94A3B8' : getStatusStyle(booking.status).color,
                                                border: isBlocked ? '1px solid rgba(100, 116, 139, 0.25)' : 'none'
                                            }}>
                                                {isBlocked ? '🚫 BLOQUEADO' : getStatusLabel(booking.status).toUpperCase()}
                                            </span>
                                        </div>

                                        {isBlocked ? (
                                            <div style={{ marginBottom: '10px' }}>
                                                <div style={{ fontWeight: '700', color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>🚫</span> Bloqueo de Disponibilidad
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    {booking.notes || booking.metadata?.notes || 'Bloqueado por el negocio'}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '3px', fontSize: '15px' }}>
                                                    {booking.customer_name || booking.customerName || '-'}
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                                    {booking.customer_phone || booking.customerPhone || ''}
                                                </div>
                                            </>
                                        )}

                                        <div style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '12px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                                            {isRentalBusiness ? (
                                                getBookingRentalDetails(booking)
                                            ) : (
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    {booking.services?.name || booking.courts?.name || booking.service || '-'}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', paddingTop: '4px' }}>
                                            {isRentalBusiness ? (
                                                getBookingFinancials(booking)
                                            ) : (
                                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {booking.price ? `$${Number(booking.price).toLocaleString('es-AR')}` : ''}
                                                </span>
                                            )}
                                            <span style={{ color: 'var(--primary-paddle, #84CC16)', fontWeight: '700', fontSize: '12px' }}>Ver detalles →</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                                <tr>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Fecha</th>
                                    {!isRentalBusiness && (
                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Hora</th>
                                    )}
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Cliente / Estado</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                        {isRentalBusiness ? 'Detalle del Alquiler' : 'Servicio'}
                                    </th>
                                    {isRentalBusiness && (
                                        <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Total / Seña</th>
                                    )}
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Estado</th>
                                    <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((booking, index) => {
                                    const isBlocked = isBookingBlocked(booking);
                                    return (
                                        <tr key={index} style={{
                                            borderTop: '1px solid var(--border)',
                                            background: isBlocked ? 'rgba(100, 116, 139, 0.04)' : 'transparent'
                                        }}>
                                            <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                {formatDisplayDate(booking.date)}
                                            </td>
                                            {!isRentalBusiness && (
                                                <td style={{ padding: '16px', fontWeight: 'bold' }}>{booking.time}</td>
                                            )}
                                            <td style={{ padding: '16px' }}>
                                                {isBlocked ? (
                                                    <div style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: '700', color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span>🚫</span> <span>Horario Bloqueado</span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            Admin / No disponible
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>
                                                            {booking.customer_name || booking.customerName || '-'}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                            {booking.customer_phone || booking.customerPhone || '-'}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {isRentalBusiness ? (
                                                    getBookingRentalDetails(booking)
                                                ) : (
                                                    booking.services?.name || booking.courts?.name || booking.service || '-'
                                                )}
                                            </td>
                                            {isRentalBusiness && (
                                                <td style={{ padding: '16px' }}>
                                                    {getBookingFinancials(booking)}
                                                </td>
                                            )}
                                            <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    letterSpacing: '0.03em',
                                                    background: isBlocked ? 'rgba(100, 116, 139, 0.15)' : getStatusStyle(booking.status).bg,
                                                    color: isBlocked ? '#94A3B8' : getStatusStyle(booking.status).color,
                                                    border: isBlocked ? '1px solid rgba(100, 116, 139, 0.25)' : 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {isBlocked ? '🚫 BLOQUEADO' : getStatusLabel(booking.status).toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleBookingClick(booking)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-main)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        fontSize: '16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Ver detalles"
                                                >
                                                    👁️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{
                            padding: '16px 20px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-main)',
                            borderBottomLeftRadius: '16px',
                            borderBottomRightRadius: '16px'
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filtered.length} reservas)
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: currentPage === 1 ? 'var(--bg-main)' : 'var(--bg-card)',
                                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                        cursor: currentPage === 1 ? 'default' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        opacity: currentPage === 1 ? 0.5 : 1
                                    }}
                                >
                                    Anterior
                                </button>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: currentPage === totalPages ? 'var(--bg-main)' : 'var(--bg-card)',
                                        color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                        cursor: currentPage === totalPages ? 'default' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        opacity: currentPage === totalPages ? 0.5 : 1
                                    }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
