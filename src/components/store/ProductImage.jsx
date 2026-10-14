import React from 'react';
import { motion } from 'framer-motion';
import { getSizedImageUrl, useImageKind } from '../../utils/productImage';

/**
 * Store grid thumbnail: photos fill the square box, cut-out PNGs float on the studio background.
 */
export function ProductCardImage({ src, alt, children }) {
    const url = getSizedImageUrl(src, 400);
    const isCutout = useImageKind(url) === 'transparent';

    return (
        <div className={`store-card-img-box${isCutout ? ' is-cutout' : ''}`}>
            <img
                src={url}
                alt={alt}
                className="store-card-img"
                loading="lazy"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: isCutout ? 'contain' : 'cover',
                    filter: isCutout ? 'drop-shadow(0 8px 14px rgba(0,0,0,0.12))' : 'none',
                    transition: 'transform 0.3s ease'
                }}
            />
            {children}
        </div>
    );
}

/**
 * Product detail hero: shows the whole image. Photos get a blurred copy of themselves
 * behind them so the box never shows empty bands; cut-outs float with a soft shadow.
 */
export function ProductDetailImage({ src, alt, animationKey }) {
    const isCutout = useImageKind(src) === 'transparent';

    return (
        <>
            {!isCutout && (
                <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(22px) saturate(1.1)',
                        transform: 'scale(1.2)',
                        opacity: 0.55,
                        pointerEvents: 'none'
                    }}
                />
            )}
            <motion.img
                key={animationKey}
                initial={{ opacity: 0.5, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22 }}
                src={src}
                alt={alt}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    padding: isCutout ? '16px' : 0,
                    boxSizing: 'border-box',
                    objectFit: 'contain',
                    filter: isCutout ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.12))' : 'none'
                }}
            />
        </>
    );
}
