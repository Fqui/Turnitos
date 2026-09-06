import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Info, X, Calendar, CalendarCheck, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export default function ServiceSelector({ services, selected, onSelect, color = '#00E676' }) {
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [categories, setCategories] = useState(['Todos']);
    const [detailService, setDetailService] = useState(null);

    useEffect(() => {
        if (services) {
            const uniqueCategories = ['Todos', ...new Set(services.map(s => s.category).filter(Boolean))];
            setCategories(uniqueCategories);
        }
    }, [services]);

    const filteredServices = activeCategory === 'Todos'
        ? services
        : services.filter(s => s.category === activeCategory);

    return (
        <div>
            {/* Category Tabs */}
            {categories.length > 2 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '20px'
                }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                backgroundColor: activeCategory === cat ? color : 'var(--bg-card)',
                                color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                boxShadow: activeCategory === cat ? `0 4px 12px ${color}40` : 'none',
                                border: activeCategory === cat ? 'none' : '1px solid var(--border)'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Services Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredServices.map(service => {
                    const isSelected = selected?.id === service.id;
                    return (
                        <div
                            key={service.id}
                            onClick={() => onSelect(service)}
                            style={{
                                position: 'relative',
                                padding: '20px',
                                borderRadius: '18px',
                                border: isSelected ? `2px solid ${color}` : '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected
                                    ? `0 4px 18px ${color}30`
                                    : '0 2px 8px rgba(0,0,0,0.04)',
                                transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                }
                            }}
                        >
                            <div>
                                {/* Selected Badge */}
                                {isSelected && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        backgroundColor: color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        boxShadow: `0 2px 8px ${color}60`,
                                        zIndex: 3
                                    }}>
                                        ✓
                                    </div>
                                )}

                                {/* Service Image Container */}
                                <div style={{
                                    position: 'relative',
                                    height: '145px',
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    marginBottom: '14px',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid var(--border)'
                                }}>
                                    {service.image || service.image_url ? (
                                        <img
                                            src={service.image || service.image_url}
                                            alt={service.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--text-secondary)',
                                            gap: '6px'
                                        }}>
                                            <Sparkles size={24} opacity={0.6} />
                                            <span style={{ fontSize: '11px', fontWeight: '600' }}>{service.category || 'Servicio'}</span>
                                        </div>
                                    )}

                                    {/* Category Badge over image */}
                                    {service.category && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '10px',
                                            left: '10px',
                                            padding: '4px 9px',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                            backdropFilter: 'blur(6px)',
                                            color: '#ffffff',
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            zIndex: 2
                                        }}>
                                            {service.category}
                                        </div>
                                    )}

                                    {/* Info Trigger pill over image */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDetailService(service);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            bottom: '10px',
                                            right: '10px',
                                            padding: '5px 10px',
                                            borderRadius: '20px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                            backdropFilter: 'blur(8px)',
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            color: '#0f172a',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                            zIndex: 2,
                                            transition: 'transform 0.15s ease'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        title="Ver detalles e información del servicio"
                                    >
                                        <Info size={13} color={color} />
                                        <span>Detalles</span>
                                    </button>
                                </div>

                                {/* Service Name */}
                                <h4 style={{
                                    fontSize: '17px',
                                    fontWeight: '800',
                                    marginBottom: '6px',
                                    color: 'var(--text-primary)',
                                    lineHeight: '1.3'
                                }}>
                                    {service.name}
                                </h4>

                                {/* Service Description */}
                                <p style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '12.5px',
                                    marginBottom: '12px',
                                    lineHeight: '1.5',
                                    display: '-webkit-box',
                                    WebkitLineClamp: '3',
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {service.description || 'Sin descripción disponible.'}
                                </p>
                            </div>

                            {/* Price and Duration Row */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '12px',
                                borderTop: '1px solid var(--border)'
                            }}>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: '900',
                                    color: color,
                                    letterSpacing: '-0.3px'
                                }}>
                                    ${Number(service.price || 0).toLocaleString('es-AR')}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    backgroundColor: 'var(--bg-main)',
                                    padding: '5px 9px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <Clock size={12} color={color} />
                                    <span>{service.duration} min</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ MODAL DE INFORMACIÓN DETALLADA DEL SERVICIO ═══ */}
            <AnimatePresence>
                {detailService && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.72)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                        onClick={() => setDetailService(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                            style={{
                                width: '100%',
                                maxWidth: '520px',
                                maxHeight: '90vh',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '26px',
                                overflow: 'hidden',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setDetailService(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                    color: '#ffffff',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    backdropFilter: 'blur(4px)',
                                    transition: 'transform 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                title="Cerrar"
                            >
                                <X size={18} />
                            </button>

                            {/* Service Hero Image */}
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                height: '210px',
                                backgroundColor: '#0f172a',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                {detailService.image || detailService.image_url ? (
                                    <img
                                        src={detailService.image || detailService.image_url}
                                        alt={detailService.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.7)',
                                        gap: '8px'
                                    }}>
                                        <Sparkles size={38} color={color} />
                                        <span style={{ fontSize: '13px', fontWeight: '700' }}>Información del Servicio</span>
                                    </div>
                                )}

                                {/* Category pill on modal hero */}
                                {detailService.category && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '16px',
                                        left: '16px',
                                        padding: '5px 12px',
                                        borderRadius: '10px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                        backdropFilter: 'blur(6px)',
                                        color: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {detailService.category}
                                    </div>
                                )}
                            </div>

                            {/* Modal Scrollable Body */}
                            <div style={{
                                padding: '24px',
                                overflowY: 'auto',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '18px'
                            }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '22px',
                                        fontWeight: '800',
                                        color: 'var(--text-primary)',
                                        margin: '0 0 10px 0',
                                        lineHeight: 1.25,
                                        letterSpacing: '-0.3px'
                                    }}>
                                        {detailService.name}
                                    </h3>

                                    {/* Duration & Price Highlights Strip */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '14px',
                                        backgroundColor: 'var(--bg-main)',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                            <Clock size={16} color={color} />
                                            <div>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: '600' }}>Duración</span>
                                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{detailService.duration} minutos</strong>
                                            </div>
                                        </div>

                                        <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border)' }} />

                                        <div style={{ flex: 1, textAlign: 'right' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: '600' }}>Valor</span>
                                            <strong style={{ fontSize: '20px', color: color, fontWeight: '900' }}>
                                                ${Number(detailService.price || 0).toLocaleString('es-AR')}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Description */}
                                <div>
                                    <h4 style={{
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        color: 'var(--text-primary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.4px',
                                        margin: '0 0 8px 0'
                                    }}>
                                        Descripción del Servicio
                                    </h4>
                                    <p style={{
                                        fontSize: '14px',
                                        color: 'var(--text-secondary)',
                                        lineHeight: '1.6',
                                        margin: 0,
                                        whiteSpace: 'pre-line'
                                    }}>
                                        {detailService.description || 'Este servicio se encuentra disponible para reservar con nuestros especialistas. Podés seleccionar el día y horario que mejor se adapte a tu agenda en el siguiente paso.'}
                                    </p>
                                </div>

                                {/* Booking Perks Micro-List */}
                                <div style={{
                                    backgroundColor: `${color}0D`,
                                    border: `1px solid ${color}28`,
                                    borderRadius: '16px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                        <CheckCircle2 size={15} color={color} />
                                        <span>Confirmación instantánea de tu turno</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                        <Calendar size={15} color={color} />
                                        <span>Elegí profesional y horario en el próximo paso</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Modal Action Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)',
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setDetailService(null)}
                                    style={{
                                        padding: '13px 18px',
                                        borderRadius: '24px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Volver
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const serviceToBook = detailService;
                                        setDetailService(null);
                                        onSelect(serviceToBook);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '13px 22px',
                                        borderRadius: '24px',
                                        border: 'none',
                                        backgroundColor: color,
                                        color: '#ffffff',
                                        fontSize: '15px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        boxShadow: `0 6px 20px ${color}45`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'transform 0.15s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <CalendarCheck size={18} strokeWidth={2.3} />
                                    <span>Reservar</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
