import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode (PWA installed and running)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent default mini-infobar or browser prompt
            e.preventDefault();
            // Stash event for manual triggering
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        } else {
            // Safari iOS or fallback if prompt not available
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                alert('📲 Para instalar en iPhone / iPad:\n1. Toca el botón Compartir (el ícono de la flechita arriba en Safari)\n2. Elige "Agregar a inicio"');
            } else {
                alert('📲 Para instalar la App:\n1. Toca los 3 puntos arriba a la derecha de tu navegador\n2. Presiona "Instalar aplicación" o "Agregar a inicio"');
            }
        }
    };

    if (isInstalled || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                    marginBottom: '32px',
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #047857 100%)',
                    padding: '24px 28px',
                    color: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 16px 32px -8px rgba(5, 150, 105, 0.4)',
                    display: 'flex',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px'
                }}
            >
                {/* Background Accent Lines */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 2 }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '18px',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                        flexShrink: 0
                    }}>
                        <img
                            src="/logo-turnitos.png"
                            alt="App Icon"
                            style={{ width: '42px', height: '42px', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>

                    <div>
                        <div style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '800',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            marginBottom: '6px'
                        }}>
                            🚀 App Gratis
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 4px 0', lineHeight: '1.2' }}>
                            ¡Descargá la App de TurnitosLR!
                        </h3>
                        <p style={{ fontSize: '13px', margin: 0, opacity: 0.9, fontWeight: '500' }}>
                            Reservá turnos en 1 segundo y recibí confirmaciones sin abrir el navegador.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2, width: window.innerWidth <= 768 ? '100%' : 'auto' }}>
                    <button
                        onClick={handleInstallClick}
                        style={{
                            flex: 1,
                            padding: '14px 24px',
                            borderRadius: '14px',
                            background: '#ffffff',
                            color: '#059669',
                            border: 'none',
                            fontWeight: '900',
                            fontSize: '14px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.04)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <span>📲</span> Instalar App Gratis
                    </button>

                    <button
                        onClick={() => setDismissed(true)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            color: '#ffffff',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                        title="Cerrar"
                    >
                        ✕
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
