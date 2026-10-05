import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const getPublicSpecialists = (business) =>
    (business?.specialists || []).filter(s => s && s.id !== 'auto-assigned' && s.name);

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 40;

const getInitials = (name = '') =>
    name
        .replace(/^(lic|dr|dra|prof)\.?\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');

// Splits "Lic. Marina Soria" into a small prefix and the name itself
const splitName = (name = '') => {
    const match = name.match(/^((?:lic|dr|dra|prof|psic)\.?)\s+(.*)$/i);
    return match ? { prefix: match[1], name: match[2] } : { prefix: '', name };
};

const getSpecialistServices = (business, specialistId) =>
    (business?.services || [])
        .filter(sv => Array.isArray(sv.specialist_ids) && sv.specialist_ids.includes(specialistId))
        .map(sv => sv.name)
        .filter(Boolean);

const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -36 : 36 })
};

const photoVariants = {
    enter: { opacity: 0, scale: 1.08 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.02 }
};

export default function ProfileAboutCard({ business, primaryColor = '#10b981' }) {
    const specialists = getPublicSpecialists(business);
    const [[index, direction], setSlide] = useState([0, 0]);
    const [isPaused, setIsPaused] = useState(false);
    const isCarousel = specialists.length > 1;
    const total = specialists.length;

    const paginate = (dir) => setSlide(([i]) => [(i + dir + total) % total, dir]);
    const goTo = (target) => setSlide(([i]) => [target, target > i ? 1 : -1]);

    useEffect(() => {
        if (!isCarousel || isPaused) return undefined;
        const timer = setTimeout(() => paginate(1), AUTOPLAY_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCarousel, isPaused, index, total]);

    if (total === 0) return null;

    const current = specialists[index] || specialists[0];
    const { prefix, name } = splitName(current.name);
    const services = getSpecialistServices(business, current.id).slice(0, 3);

    const handleDragEnd = (_, info) => {
        if (info.offset.x < -SWIPE_THRESHOLD) paginate(1);
        else if (info.offset.x > SWIPE_THRESHOLD) paginate(-1);
    };

    return (
        <section
            className="profile-about-card"
            id="nosotros"
            aria-label="Nosotros"
            aria-roledescription={isCarousel ? 'carrusel' : undefined}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{ '--about-accent': primaryColor }}
        >
            <motion.div
                className="profile-about-body"
                drag={isCarousel ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragStart={() => setIsPaused(true)}
                onDragEnd={handleDragEnd}
            >
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                        key={current.id}
                        className="profile-about-info"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="profile-about-eyebrow">
                            <span className="profile-about-eyebrow-dot" />
                            Nosotros
                        </div>
                        <div className="profile-about-name">
                            {prefix && <span className="profile-about-prefix">{prefix}</span>}
                            {name}
                        </div>
                        {current.role && <span className="profile-about-pill">{current.role}</span>}
                    </motion.div>
                </AnimatePresence>

                {services.length > 0 && (
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.ul
                            key={`sv-${current.id}`}
                            className="profile-about-services"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.28, delay: 0.06 }}
                        >
                            {services.map(sv => (
                                <li key={sv}>
                                    <span className="profile-about-bullet" />
                                    <span className="profile-about-service-name">{sv}</span>
                                </li>
                            ))}
                        </motion.ul>
                    </AnimatePresence>
                )}
            </motion.div>

            <div className="profile-about-photo">
                <AnimatePresence initial={false}>
                    <motion.div
                        key={`ph-${current.id}`}
                        className="profile-about-photo-inner"
                        variants={photoVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                    >
                        {current.avatar_url ? (
                            <img src={current.avatar_url} alt={current.name} draggable={false} />
                        ) : (
                            <div className="profile-about-initials">{getInitials(current.name)}</div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="profile-about-rail">
                {isCarousel && (
                    <>
                        <button type="button" className="profile-about-rail-btn" onClick={() => paginate(-1)} aria-label="Profesional anterior">
                            <ChevronUp size={15} strokeWidth={2.6} />
                        </button>
                        <div className="profile-about-rail-dots">
                            {specialists.map((s, i) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    aria-label={`Ver a ${s.name}`}
                                    aria-current={i === index}
                                    className={`profile-about-rail-dot${i === index ? ' is-active' : ''}`}
                                    onClick={() => goTo(i)}
                                />
                            ))}
                        </div>
                        <button type="button" className="profile-about-rail-btn" onClick={() => paginate(1)} aria-label="Profesional siguiente">
                            <ChevronDown size={15} strokeWidth={2.6} />
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}
