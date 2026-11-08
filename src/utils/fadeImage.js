// Props for an <img> that fades in once loaded (also covers images already in cache)
const reveal = (el) => el && el.classList.add('is-loaded');

export const fadeInImageProps = {
    className: 'img-fade',
    onLoad: (e) => reveal(e.currentTarget),
    onError: (e) => reveal(e.currentTarget),
    ref: (el) => {
        if (el && el.complete) reveal(el);
    },
};
