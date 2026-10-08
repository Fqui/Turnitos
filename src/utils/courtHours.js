// Court shifts and start times: a court can only start a booking if at least
// the shortest duration fits before the shift closes.

// Pádel books in fixed durations
export const PADEL_DURATIONS = [60, 90, 120];

const toMinutes = (time) => {
    const [h, m] = String(time || '').split(':').map(Number);
    if (Number.isNaN(h)) return NaN;
    return h * 60 + (Number.isNaN(m) ? 0 : m);
};

/**
 * Shifts of a day as [start, end] minutes counted from the opening day.
 * A shift that crosses midnight ends after 1440 (18:00–02:00 -> [1080, 1560]),
 * and so do the early-hours shifts of an overnight day.
 * @param {Array<{open: string, close: string}>} ranges - Opening ranges of the day
 * @returns {Array<[number, number]>}
 */
export function buildShiftRanges(ranges) {
    const valid = (ranges || [])
        .map(r => [toMinutes(r?.open), toMinutes(r?.close)])
        .filter(([open, close]) => !Number.isNaN(open) && !Number.isNaN(close));
    if (valid.length === 0) return [];

    const firstOpen = Math.min(...valid.map(([open]) => open));
    const crossesMidnight = valid.some(([open, close]) => close <= open || close > 1440);
    const shift = (min) => (crossesMidnight && min < firstOpen ? min + 1440 : min);

    return valid.map(([open, close]) => {
        const start = shift(open);
        let end = shift(close);
        if (end <= start) end += 1440;
        return [start, end];
    });
}

/**
 * Shifts of a day from the business hours config of that day
 * ({ open, close, open2, close2, isSplit, breakStart, breakEnd, ranges, isOpen }).
 */
export function getDayShiftRanges(dayConfig) {
    if (!dayConfig || dayConfig.isOpen === false || !dayConfig.open || !dayConfig.close) return [];
    const ranges = [];
    if (dayConfig.isSplit && dayConfig.breakStart && dayConfig.breakEnd && !dayConfig.open2) {
        ranges.push({ open: dayConfig.open, close: dayConfig.breakStart });
        ranges.push({ open: dayConfig.breakEnd, close: dayConfig.close });
    } else {
        ranges.push({ open: dayConfig.open, close: dayConfig.close });
        if (dayConfig.open2 && dayConfig.close2) ranges.push({ open: dayConfig.open2, close: dayConfig.close2 });
    }
    if (Array.isArray(dayConfig.ranges)) ranges.push(...dayConfig.ranges);
    return buildShiftRanges(ranges);
}

/**
 * Where a start time falls in the day's shifts.
 * @returns {{ start: number, end: number } | null} Start and shift close in minutes, or null if closed
 */
export function findShift(startTime, shiftRanges) {
    if (!shiftRanges || shiftRanges.length === 0) return null;
    const firstOpen = Math.min(...shiftRanges.map(([start]) => start));
    const crossesMidnight = shiftRanges.some(([, end]) => end > 1440);
    let start = toMinutes(startTime);
    if (Number.isNaN(start)) return null;
    if (crossesMidnight && start < firstOpen) start += 1440;
    const range = shiftRanges.find(([from, to]) => start >= from && start < to);
    return range ? { start, end: range[1] } : null;
}

/**
 * True if a booking of `minDuration` minutes starting at `startTime` ends before its shift closes
 */
export function fitsInShift(startTime, shiftRanges, minDuration = PADEL_DURATIONS[0]) {
    const shift = findShift(startTime, shiftRanges);
    return !!shift && shift.start + minDuration <= shift.end;
}
