import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VenueLightboxModal({
    showLightbox,
    setShowLightbox,
    lightboxIndex,
    setLightboxIndex,
    galleryImages
}) {
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
                        padding: '20px'
                    }}
                    onClick={() => setShowLightbox(false)}
                >
                    <button
                        onClick={() => setShowLightbox(false)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            color: 'white',
                            fontSize: '24px',
                            cursor: 'pointer',
                            zIndex: 10
                        }}
                    >
                        ×
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.max(0, lightboxIndex - 1)); }}
                        disabled={lightboxIndex === 0}
                        style={{
                            position: 'absolute',
                            left: '20px',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            color: 'white',
                            fontSize: '24px',
                            cursor: lightboxIndex === 0 ? 'not-allowed' : 'pointer',
                            opacity: lightboxIndex === 0 ? 0.3 : 1
                        }}
                    >
                        ‹
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex(Math.min(galleryImages.length - 1, lightboxIndex + 1)); }}
                        disabled={lightboxIndex === galleryImages.length - 1}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            color: 'white',
                            fontSize: '24px',
                            cursor: lightboxIndex === galleryImages.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: lightboxIndex === galleryImages.length - 1 ? 0.3 : 1
                        }}
                    >
                        ›
                    </button>
                    <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img
                            src={galleryImages[lightboxIndex]?.url}
                            alt={galleryImages[lightboxIndex]?.caption}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '12px'
                            }}
                        />
                        {galleryImages[lightboxIndex]?.caption && (
                            <div style={{
                                position: 'absolute',
                                bottom: '40px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(10px)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '500'
                            }}>
                                {galleryImages[lightboxIndex].caption}
                            </div>
                        )}
                        <div style={{
                            position: 'absolute',
                            bottom: '80px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}>
                            {lightboxIndex + 1} / {galleryImages.length}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
