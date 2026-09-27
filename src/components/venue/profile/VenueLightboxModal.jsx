import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VenueLightboxModal({
    showLightbox,
    setShowLightbox,
    lightboxIndex,
    setLightboxIndex,
    galleryImages
}) {
    // Keyboard navigation: Escape to close, arrows to cycle
    React.useEffect(() => {
        if (!showLightbox) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowLightbox(false);
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex(prev => Math.min(galleryImages.length - 1, prev + 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showLightbox, galleryImages.length, setShowLightbox, setLightboxIndex]);

    return (
        <AnimatePresence>
            {showLightbox && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.95)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                    onClick={() => setShowLightbox(false)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setShowLightbox(false)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            color: 'white',
                            fontSize: '22px',
                            cursor: 'pointer',
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ✕
                    </button>

                    {/* Previous Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)); }}
                        disabled={lightboxIndex === 0}
                        style={{
                            position: 'absolute',
                            left: '20px',
                            background: 'rgba(255,255,255,0.18)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            color: 'white',
                            fontSize: '26px',
                            cursor: lightboxIndex === 0 ? 'not-allowed' : 'pointer',
                            opacity: lightboxIndex === 0 ? 0.25 : 1,
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ‹
                    </button>

                    {/* Next Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.min(galleryImages.length - 1, lightboxIndex + 1)); }}
                        disabled={lightboxIndex === galleryImages.length - 1}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            background: 'rgba(255,255,255,0.18)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            color: 'white',
                            fontSize: '26px',
                            cursor: lightboxIndex === galleryImages.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: lightboxIndex === galleryImages.length - 1 ? 0.25 : 1,
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ›
                    </button>

                    {/* Photo Content */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '92vw',
                            maxHeight: '82vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}
                    >
                        <img
                            src={galleryImages[lightboxIndex]?.url}
                            alt={galleryImages[lightboxIndex]?.caption || `Foto ${lightboxIndex + 1}`}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}
                        />
                    </div>

                    {/* Bottom Container: Photo Counter & Epígrafe stacked with guaranteed gap */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            bottom: '24px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            maxWidth: '90vw',
                            zIndex: 15,
                            pointerEvents: 'none'
                        }}
                    >
                        {/* Number of Photo Badge */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            color: 'white',
                            padding: '4px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            pointerEvents: 'auto'
                        }}>
                            {lightboxIndex + 1} / {galleryImages.length}
                        </div>

                        {/* Caption / Epígrafe */}
                        {galleryImages[lightboxIndex]?.caption && (
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.78)',
                                backdropFilter: 'blur(14px)',
                                WebkitBackdropFilter: 'blur(14px)',
                                color: 'white',
                                padding: '8px 18px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '500',
                                textAlign: 'center',
                                lineHeight: '1.4',
                                maxWidth: '580px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                                pointerEvents: 'auto',
                                wordBreak: 'break-word'
                            }}>
                                {galleryImages[lightboxIndex].caption}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
