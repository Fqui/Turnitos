import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpecialistsShowcase({ specialists, businessType }) {
    if (!specialists || specialists.length === 0) return null;

    const [selectedSpecialist, setSelectedSpecialist] = useState(null);
    // Only show for service businesses as requested, or maybe all? User said "en los negocios de servicios"
    // But good to be safe. If passed, we show.

    const isSingle = specialists.length === 1;

    return (
        <section style={{ marginBottom: '20px', marginTop: '10px' }}>
            {!isSingle && (
                <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    color: 'var(--text-primary)',
                    paddingLeft: '10px'
                }}>
                    Nuestro Equipo
                </h3>
            )}

            {isSingle ? (
                <SingleSpecialistCard specialist={specialists[0]} onClick={() => setSelectedSpecialist(specialists[0])} />
            ) : (
                <MultiSpecialistList specialists={specialists} onSelect={setSelectedSpecialist} />
            )}

            <AnimatePresence>
                {selectedSpecialist && (
                    <SpecialistModal
                        specialist={selectedSpecialist}
                        showBio={isSingle}
                        onClose={() => setSelectedSpecialist(null)}
                    />
                )}
            </AnimatePresence>
        </section>
    );
}

function SingleSpecialistCard({ specialist, onClick }) {
    return (
        <motion.div
            onClick={onClick}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileTap={{ scale: 0.98 }}
            style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                height: '140px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px -5px rgba(0,0,0,0.2)',
                border: '1px solid var(--border)',
            }}
        >
            {/* Background Image with Blur */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${specialist.avatar_url || `https://ui-avatars.com/api/?name=${specialist.name}&background=random&size=400`})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(10px) brightness(0.6)',
                transform: 'scale(1.1)'
            }} />

            {/* Overlay Gradient */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(to right, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.3) 100%)',
                zIndex: 1
            }} />

            {/* Content Container */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                padding: '0 20px',
                gap: '20px'
            }}>
                {/* Clear Avatar */}
                <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '3px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    flexShrink: 0
                }}>
                    <img
                        src={specialist.avatar_url || `https://ui-avatars.com/api/?name=${specialist.name}&background=random&size=200`}
                        alt={specialist.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {/* Text Info */}
                <div style={{ color: '#fff' }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '4px',
                        opacity: 0.9,
                        background: 'var(--primary-paddle)',
                        color: '#000',
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '6px'
                    }}>
                        {specialist.role || 'Especialista'}
                    </div>
                    <h4 style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        margin: '0 0 6px 0',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        {specialist.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.8 }}>
                        <span>⭐ Ver biografía</span>
                    </div>
                </div>
            </div>

            {/* Glass decoration */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                borderRadius: '50%',
                zIndex: 1
            }} />
        </motion.div>
    );
}

function MultiSpecialistList({ specialists, onSelect }) {
    const scrollRef = useRef(null);

    return (
        <div style={{ position: 'relative', margin: '0 -16px' }}>
            {/* Scroll Container */}
            <div
                ref={scrollRef}
                style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    padding: '0 20px 10px', // Extra bottom padding for shadow/hover
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {specialists.map((specialist, index) => (
                    <motion.div
                        key={specialist.id || index}
                        onClick={() => onSelect(specialist)}
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            flex: '0 0 auto',
                            scrollSnapAlign: 'start',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            width: '100px',
                            cursor: 'pointer'
                        }}
                    >
                        {/* Circle Avatar with Ring */}
                        <div
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                padding: '3px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                marginBottom: '8px',
                                position: 'relative',
                            }}
                        >
                            <img
                                src={specialist.avatar_url || `https://ui-avatars.com/api/?name=${specialist.name}&background=random&size=200`}
                                alt={specialist.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                        </div>

                        <h5 style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            margin: '0 0 2px 0',
                            maxWidth: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {specialist.name}
                        </h5>
                        <p style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            margin: 0,
                        }}>
                            {specialist.role || 'Especialista'}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Fade Indicators for Scroll */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '30px',
                background: 'linear-gradient(to right, transparent, var(--bg-main))', // Uses bg-main for fade
                pointerEvents: 'none'
            }} />
        </div>
    );
}

function SpecialistModal({ specialist, showBio, onClose }) {
    if (!specialist) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
        >
            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={{
                    background: 'var(--bg-card)',
                    padding: '0',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '320px',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.2)',
                        border: 'none',
                        color: '#fff',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ✕
                </button>

                <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                    <img
                        src={specialist.image_url || specialist.avatar_url || `https://ui-avatars.com/api/?name=${specialist.name}&background=random&size=400`}
                        alt={specialist.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        height: '80px',
                        background: 'linear-gradient(to top, var(--bg-card), transparent)'
                    }} />
                </div>

                {/* Content */}
                <div style={{ padding: '24px', textAlign: 'center', marginTop: '-20px', position: 'relative' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                        {specialist.name}
                    </h3>
                    <div style={{
                        display: 'inline-block',
                        background: 'var(--primary-paddle)',
                        color: '#000',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        marginBottom: showBio ? '20px' : '0',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {specialist.role || 'Especialista'}
                    </div>

                    {showBio && (
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6',
                            margin: 0
                        }}>
                            {specialist.bio || 'Un profesional apasionado por su trabajo, con años de experiencia brindando el mejor servicio a sus clientes. Especializado en tratamientos personalizados.'}
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
