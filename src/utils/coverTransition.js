// Shared-element morph from a home card's cover to the business profile banner,
// using the browser's View Transitions API. Browsers without it navigate normally.
export const COVER_TRANSITION_NAME = 'business-cover';

// Props for the profile banner image that receives the morph
export const coverTargetProps = {
    'data-cover-target': '',
    style: { viewTransitionName: COVER_TRANSITION_NAME },
};

export const canMorphCover = () =>
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Resolves once the profile banner is on screen (or after the timeout, so the page never hangs)
const waitForCoverTarget = (timeout = 600) => new Promise(resolve => {
    const start = performance.now();
    const check = () => {
        const el = document.querySelector('[data-cover-target]');
        if ((el && el.complete) || performance.now() - start > timeout) return resolve();
        setTimeout(check, 16);
    };
    check();
});

// While the morph runs, the app skips its own page fade so the swap is instant
let morphing = false;
export const isCoverMorphing = () => morphing;

export function morphCoverTo(sourceImg, go) {
    if (sourceImg) sourceImg.style.viewTransitionName = COVER_TRANSITION_NAME;
    morphing = true;
    let updated = false;
    const transition = document.startViewTransition(async () => {
        updated = true;
        if (sourceImg) sourceImg.style.viewTransitionName = '';
        go();
        await waitForCoverTarget();
    });
    // If the browser never gets to the swap (e.g. a background tab), navigate without the morph
    const fallback = setTimeout(() => { if (!updated) transition.skipTransition(); }, 400);
    transition.finished.catch(() => {}).finally(() => {
        clearTimeout(fallback);
        morphing = false;
    });
}
