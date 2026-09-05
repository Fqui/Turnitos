import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORY_DURATION = 5000; // 5 seconds per image slide
const PROGRESS_INTERVAL = 30; // Update progress every 30ms

/**
 * Detect if a URL points to a video file
 */
function isVideoUrl(url) {
    if (!url) return false;
    if (typeof url === 'object' && url.type === 'video') return true;
    const str = typeof url === 'object' ? url.url : url;
    return /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(str);
}

/**
 * Get the actual URL string from either a string or object
 */
function getUrl(item) {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.url || '';
}

export default function ProfileStoryViewerModal({
    business,
    selectedHighlight,
    setSelectedHighlight,
    selectedPhotoIndex,
    setSelectedPhotoIndex,
    storyViewerList,
    setStoryViewerList,
    activeStories
}) {
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [videoDuration, setVideoDuration] = useState(null);

    const timerRef = useRef(null);
    const progressRef = useRef(0);
    const videoRef = useRef(null);
    const holdTimerRef = useRef(null);
    const isHoldingRef = useRef(false);

    const viewerHighlights = storyViewerList || activeStories || [];
    const highlight = viewerHighlights[selectedHighlight] || null;

    const items = (highlight?.images && highlight.images.length > 0)
        ? highlight.images
        : (highlight?.cover_image ? [highlight.cover_image] : []);
    const totalItems = items.length;
    const currentItem = items[selectedPhotoIndex] || items[0];
    const currentUrl = getUrl(currentItem);
    const currentIsVideo = isVideoUrl(currentItem);

    const handleClose = useCallback(() => {
        setSelectedPhotoIndex(null);
        setSelectedHighlight(null);
        if (setStoryViewerList) setStoryViewerList(null);
    }, [setSelectedPhotoIndex, setSelectedHighlight, setStoryViewerList]);

    const goToNext = useCallback(() => {
        const nextIndex = (selectedPhotoIndex ?? 0) + 1;
        if (nextIndex >= totalItems) {
            // Move to next highlight or close
            if (selectedHighlight !== null && selectedHighlight < viewerHighlights.length - 1) {
                setSelectedHighlight(selectedHighlight + 1);
                setSelectedPhotoIndex(0);
            } else {
                handleClose();
            }
        } else {
            setSelectedPhotoIndex(nextIndex);
        }
        setProgress(0);
        progressRef.current = 0;
    }, [selectedPhotoIndex, totalItems, selectedHighlight, viewerHighlights.length, setSelectedHighlight, setSelectedPhotoIndex, handleClose]);

    const goToPrev = useCallback(() => {
        if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
            setSelectedPhotoIndex(selectedPhotoIndex - 1);
        } else if (selectedHighlight !== null && selectedHighlight > 0) {
            const prevHighlight = viewerHighlights[selectedHighlight - 1];
            const prevItems = prevHighlight?.images?.length || 1;
            setSelectedHighlight(selectedHighlight - 1);
            setSelectedPhotoIndex(prevItems - 1);
        }
        setProgress(0);
        progressRef.current = 0;
    }, [selectedPhotoIndex, selectedHighlight, viewerHighlights, setSelectedHighlight, setSelectedPhotoIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (selectedHighlight === null || selectedPhotoIndex === null) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
            else if (e.key === 'ArrowRight') goToNext();
            else if (e.key === 'ArrowLeft') goToPrev();
            else if (e.key === ' ') {
                e.preventDefault();
                setIsPaused(p => !p);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedHighlight, selectedPhotoIndex, handleClose, goToNext, goToPrev]);

    // Progress timer for images and fallback
    useEffect(() => {
        if (selectedHighlight === null || selectedPhotoIndex === null) return;
        if (isPaused) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        // If it's a video, progress is driven by video timeUpdate
        if (currentIsVideo) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        const duration = STORY_DURATION;
        const step = 100 / (duration / PROGRESS_INTERVAL);

        timerRef.current = setInterval(() => {
            progressRef.current += step;
            if (progressRef.current >= 100) {
                clearInterval(timerRef.current);
                goToNext();
            } else {
                setProgress(progressRef.current);
            }
        }, PROGRESS_INTERVAL);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, selectedPhotoIndex, selectedHighlight, currentIsVideo, goToNext]);

    // Reset progress when item changes
    useEffect(() => {
        setProgress(0);
        progressRef.current = 0;
        setVideoDuration(null);
    }, [selectedPhotoIndex, selectedHighlight]);

    // Video events
    const handleVideoTimeUpdate = (e) => {
        if (isPaused) return;
        const current = e.target.currentTime;
        const dur = e.target.duration || videoDuration || 1;
        const p = Math.min((current / dur) * 100, 100);
        setProgress(p);
        progressRef.current = p;
    };

    const handleVideoLoadedMetadata = (e) => {
        const dur = e.target.duration;
        if (dur && isFinite(dur)) {
            setVideoDuration(dur);
        }
        if (!isPaused && videoRef.current) {
            videoRef.current.play().catch(() => {});
        }
    };

    // Pause/resume control for video
    useEffect(() => {
        if (!videoRef.current || !currentIsVideo) return;
        if (isPaused) {
            videoRef.current.pause();
        } else {
            videoRef.current.play().catch(() => {});
        }
    }, [isPaused, currentIsVideo]);

    // Hold-to-pause logic
    const handlePointerDown = () => {
        isHoldingRef.current = false;
        holdTimerRef.current = setTimeout(() => {
            isHoldingRef.current = true;
            setIsPaused(true);
        }, 180);
    };

    const handlePointerUp = (zone) => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

        if (isHoldingRef.current) {
            // Was holding to pause; just resume without advancing
            isHoldingRef.current = false;
            setIsPaused(false);
            return;
        }

        // Quick tap: navigate
        if (zone === 'left') {
            goToPrev();
        } else {
            goToNext();
        }
    };

    if (selectedHighlight === null || selectedPhotoIndex === null || !highlight) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.92)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    overflow: 'hidden'
                }}
            >
                {/* ═══ DESKTOP PREV ARROW ═══ */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        goToPrev();
                    }}
                    className="story-nav-arrow story-nav-prev"
                    style={{
                        position: 'absolute',
                        left: 'max(16px, calc(50% - 280px))',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        color: 'white',
                        fontSize: '20px',
                        cursor: 'pointer',
                        zIndex: 2020,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                    }}
                    title="Anterior (flecha izquierda)"
                >
                    ❮
                </button>

                {/* ═══ DESKTOP NEXT ARROW ═══ */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                    }}
                    className="story-nav-arrow story-nav-next"
                    style={{
                        position: 'absolute',
                        right: 'max(16px, calc(50% - 280px))',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        color: 'white',
                        fontSize: '20px',
                        cursor: 'pointer',
                        zIndex: 2020,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                    }}
                    title="Siguiente (flecha derecha)"
                >
                    ❯
                </button>

                {/* ═══ STORY VIEWER CARD (Mobile full-bleed, Desktop 9:16 phone ratio) ═══ */}
                <div
                    className="story-container"
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100dvh',
                        maxWidth: '430px',
                        maxHeight: '100dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#000',
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
                    }}
                >
                    {/* Ambient Blurred Background */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: '-20px',
                            backgroundImage: currentUrl ? `url(${currentUrl})` : 'none',
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                            filter: 'blur(35px) brightness(0.4)',
                            transform: 'scale(1.15)',
                            zIndex: 1,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Top gradient shadow for UI elements */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '120px',
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
                            zIndex: 2005,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Bottom gradient shadow */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '100px',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
                            zIndex: 2005,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* ═══ PROGRESS BARS ═══ */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
                            left: '12px',
                            right: '12px',
                            display: 'flex',
                            gap: '4px',
                            zIndex: 2010
                        }}
                    >
                        {items.map((_, index) => (
                            <div
                                key={index}
                                style={{
                                    flex: 1,
                                    height: '2.5px',
                                    borderRadius: '2px',
                                    background: 'rgba(255,255,255,0.3)',
                                    overflow: 'hidden'
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        borderRadius: '2px',
                                        background: '#fff',
                                        width: index < (selectedPhotoIndex ?? 0)
                                            ? '100%'
                                            : index === selectedPhotoIndex
                                                ? `${progress}%`
                                                : '0%',
                                        transition: currentIsVideo
                                            ? 'none'
                                            : (index === selectedPhotoIndex ? 'none' : 'width 0.2s ease')
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* ═══ HEADER: Avatar + Name + Buttons ═══ */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(env(safe-area-inset-top, 0px) + 22px)',
                            left: '12px',
                            right: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 2010
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            {(business?.logo || business?.image) && (
                                <img
                                    src={business.logo || business.image}
                                    alt={business.name}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid rgba(255,255,255,0.85)',
                                        flexShrink: 0
                                    }}
                                />
                            )}
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    color: '#fff',
                                    textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {business?.name || highlight.title}
                                </div>
                                {highlight.title && highlight.title !== 'Historia' && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'rgba(255,255,255,0.75)',
                                        textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                                    }}>
                                        {highlight.title}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top Action Buttons (Mute + Close) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {currentIsVideo && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMuted(m => !m);
                                    }}
                                    style={{
                                        background: 'rgba(0,0,0,0.4)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '34px',
                                        height: '34px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        backdropFilter: 'blur(8px)',
                                        transition: 'background 0.2s'
                                    }}
                                    title={isMuted ? 'Activar sonido' : 'Silenciar'}
                                >
                                    {isMuted ? '🔇' : '🔊'}
                                </button>
                            )}

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClose();
                                }}
                                style={{
                                    background: 'rgba(0,0,0,0.4)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '34px',
                                    height: '34px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    lineHeight: 1,
                                    backdropFilter: 'blur(8px)'
                                }}
                                title="Cerrar (Esc)"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* ═══ TAP ZONES (Left 32% / Right 68%) ═══ */}
                    <div
                        onPointerDown={handlePointerDown}
                        onPointerUp={() => handlePointerUp('left')}
                        onPointerCancel={() => {
                            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                            isHoldingRef.current = false;
                            setIsPaused(false);
                        }}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '32%',
                            zIndex: 2006,
                            cursor: 'pointer'
                        }}
                    />
                    <div
                        onPointerDown={handlePointerDown}
                        onPointerUp={() => handlePointerUp('right')}
                        onPointerCancel={() => {
                            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                            isHoldingRef.current = false;
                            setIsPaused(false);
                        }}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: '68%',
                            zIndex: 2006,
                            cursor: 'pointer'
                        }}
                    />

                    {/* ═══ MEDIA CONTENT (Image or Video) ═══ */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${selectedHighlight}-${selectedPhotoIndex}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 2
                            }}
                        >
                            {currentIsVideo ? (
                                <video
                                    ref={videoRef}
                                    src={currentUrl}
                                    autoPlay
                                    playsInline
                                    muted={isMuted}
                                    onLoadedMetadata={handleVideoLoadedMetadata}
                                    onTimeUpdate={handleVideoTimeUpdate}
                                    onEnded={goToNext}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        pointerEvents: 'none'
                                    }}
                                />
                            ) : (
                                <img
                                    src={currentUrl}
                                    alt={`${highlight.title} - ${(selectedPhotoIndex ?? 0) + 1}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        pointerEvents: 'none'
                                    }}
                                    draggable={false}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* ═══ PAUSE INDICATOR ═══ */}
                    <AnimatePresence>
                        {isPaused && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                style={{
                                    position: 'absolute',
                                    bottom: '36px',
                                    background: 'rgba(0,0,0,0.7)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '7px 18px',
                                    borderRadius: '20px',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    zIndex: 2015,
                                    pointerEvents: 'none',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                ⏸ Pausado
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
