import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (selectedHighlight === null || selectedPhotoIndex === null) return null;

    const viewerHighlights = storyViewerList || activeStories || [];
    const highlight = viewerHighlights[selectedHighlight];
    if (!highlight) return null;

    const images = (highlight.images && highlight.images.length > 0)
        ? highlight.images
        : (highlight.cover_image ? [highlight.cover_image] : []);
    const totalImages = images.length;

    const handleClose = () => {
        setSelectedPhotoIndex(null);
        setSelectedHighlight(null);
        if (setStoryViewerList) setStoryViewerList(null);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}
                onClick={handleClose}
            >
                {/* Instagram-style progress bars */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    display: 'flex',
                    gap: '4px',
                    zIndex: 2002
                }}>
                    {images.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                flex: 1,
                                height: '3px',
                                borderRadius: '2px',
                                background: index <= selectedPhotoIndex
                                    ? 'white'
                                    : 'rgba(255,255,255,0.3)',
                                transition: 'background 0.3s'
                            }}
                        />
                    ))}
                </div>

                {/* Close Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClose();
                    }}
                    style={{
                        position: 'absolute',
                        top: '50px',
                        right: '20px',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        fontSize: '24px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)',
                        zIndex: 2002
                    }}
                >
                    ×
                </button>

                {/* Header with avatar and title */}
                <div style={{
                    position: 'absolute',
                    top: '46px',
                    left: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'white',
                    zIndex: 2002
                }}>
                    {(business?.logo || business?.image) && (
                        <img
                            src={business.logo || business.image}
                            alt={business.name}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid rgba(255,255,255,0.85)'
                            }}
                        />
                    )}
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                            {business?.name || highlight.title}
                        </div>
                        {business?.name && highlight.title && highlight.title !== 'Historia' && (
                            <div style={{ fontSize: '12px', opacity: 0.85, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                                {highlight.title}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation areas (left/right tap zones) */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhotoIndex((prev) =>
                            prev > 0 ? prev - 1 : totalImages - 1
                        );
                    }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '30%',
                        cursor: 'pointer',
                        zIndex: 2001
                    }}
                />
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        const nextIndex = selectedPhotoIndex + 1;
                        if (nextIndex >= totalImages) {
                            // Move to next highlight or close
                            if (selectedHighlight < viewerHighlights.length - 1) {
                                setSelectedHighlight(selectedHighlight + 1);
                                setSelectedPhotoIndex(0);
                            } else {
                                handleClose();
                            }
                        } else {
                            setSelectedPhotoIndex(nextIndex);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '70%',
                        cursor: 'pointer',
                        zIndex: 2001
                    }}
                />

                {/* Current image */}
                <motion.img
                    key={`${selectedHighlight}-${selectedPhotoIndex}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    src={images[selectedPhotoIndex]}
                    alt={`${highlight.title} - ${selectedPhotoIndex + 1}`}
                    style={{
                        maxWidth: '90%',
                        maxHeight: '80vh',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        pointerEvents: 'none'
                    }}
                />

                {/* Image counter */}
                <div style={{
                    position: 'absolute',
                    bottom: '30px',
                    color: 'white',
                    fontSize: '14px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)',
                    zIndex: 2002
                }}>
                    {selectedPhotoIndex + 1} / {totalImages}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
