import React from 'react';
import { parseFrame, frameImageStyle } from '../../utils/imageFrame';

// Photo that fills its box using the framing the owner chose (see utils/imageFrame).
// Drop-in for `<img style={{ width: '100%', height: '100%', objectFit: 'cover' }}>`: the parent
// sets the size; with "whole photo" the leftover space shows the same photo blurred.
export default function FramedImage({ src, alt = '', fallbackPosition = 'center', style, imgStyle, className, loading, draggable, onLoad, onError }) {
    const { src: file, frame } = parseFrame(src);
    if (!file) return null;

    const img = (
        <img
            src={file}
            alt={alt}
            loading={loading}
            draggable={draggable}
            onLoad={onLoad}
            onError={onError}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', objectFit: 'cover', ...frameImageStyle(frame, fallbackPosition), ...imgStyle }}
        />
    );

    return (
        <div className={className} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
            {frame?.whole && (
                <img
                    src={file}
                    alt=""
                    aria-hidden="true"
                    loading={loading}
                    draggable={false}
                    style={{ position: 'absolute', inset: '-24px', width: 'calc(100% + 48px)', height: 'calc(100% + 48px)', objectFit: 'cover', filter: 'blur(20px) brightness(0.85)', display: 'block' }}
                />
            )}
            {img}
        </div>
    );
}
