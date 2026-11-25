/**
 * mockSeats.js — simulated seat availability provider.
 *
 * Rules (from docs/SEAT_MOCK_SPEC.md):
 *   Key: (trainNumber, originStartDate as YYYY-MM-DD, classCode)
 *   Seeded pseudo-random generator (mulberry32) keyed by hash of above.
 *   Per interval between consecutive stops in corridor.json:
 *     60% AVL  n∈[1..40]
 *     10% RAC  n∈[1..12]
 *     30% WL   n∈[1..60]
 *   A leg's status = worst interval it covers.
 *   Demo override: for SSM→NDLS, trains 12877/12397/12815/12801 always WL.
 *
 * Interface (TRD §6):
 *   getLegStatus({ trainNumber, originStartDate, classCode, fromCode, toCode })
 *   → { status: "AVL"|"RAC"|"WL", count: number, simulated: true }
 */

/**
 * The four trains that must show WL for the SSM→NDLS direct demo.
 * Keep in one constant so it is easy to find and change.
 */
const DEMO_FORCE_WL = new Set(['12877', '12397', '12815', '12801']);

/**
 * Class code mapping to corridor.json classes field keys.
 */
const CLASS_KEY = {
  SL: 'sleeper',
  '3A': 'third_ac',
  '2A': 'second_ac',
  '1A': 'first_ac',
};

/**
 * Mulberry32 seeded PRNG — deterministic, fast, good quality for this use.
 * Returns a function that produces floats in [0, 1).
 * @param {number} seed  — 32-bit unsigned integer
 * @returns {() => number}
 */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple djb2-style string hash → 32-bit unsigned int.
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/**
 * Generate per-interval status array for a given (train, originStartDate, class).
 * Returns an array of { status, count } objects, one per interval.
 *
 * @param {string} trainNumber
 * @param {string} originStartDate  — "YYYY-MM-DD"
 * @param {string} classCode        — "SL"|"3A"|"2A"|"1A"
 * @param {number} numIntervals     — number of stop-to-stop intervals on the train
 * @returns {Array<{status: string, count: number}>}
 */
function generateIntervals(trainNumber, originStartDate, classCode, numIntervals) {
  const key = `${trainNumber}|${originStartDate}|${classCode}`;
  const seed = hashString(key);
  const rng = mulberry32(seed);

  const intervals = [];
  for (let i = 0; i < numIntervals; i++) {
    const r = rng();
    if (r < 0.60) {
      // AVL: 60%, n in [1..40]
      const n = Math.floor(rng() * 40) + 1;
      intervals.push({ status: 'AVL', count: n });
    } else if (r < 0.70) {
      // RAC: 10%, n in [1..12]
      const n = Math.floor(rng() * 12) + 1;
      intervals.push({ status: 'RAC', count: n });
    } else {
      // WL: 30%, n in [1..60]
      const n = Math.floor(rng() * 60) + 1;
      intervals.push({ status: 'WL', count: n });
    }
  }
  return intervals;
}

/**
 * Worst-of-intervals rule:
 *   any WL → WL (largest WL count)
 *   any RAC → RAC (largest RAC count)
 *   all AVL → AVL (smallest AVL count, since it's the constrained resource)
 *
 * @param {Array<{status: string, count: number}>} intervals
 * @returns {{status: string, count: number}}
 */
function worstInterval(intervals) {
  let wlCount = 0;
  let racCount = 0;
  let avlCount = Infinity;

  for (const { status, count } of intervals) {
    if (status === 'WL') wlCount = Math.max(wlCount, count);
    else if (status === 'RAC') racCount = Math.max(racCount, count);
    else if (status === 'AVL') avlCount = Math.min(avlCount, count);
  }

  if (wlCount > 0) return { status: 'WL', count: wlCount };
  if (racCount > 0) return { status: 'RAC', count: racCount };
  return { status: 'AVL', count: avlCount === Infinity ? 1 : avlCount };
}

/**
 * Cache: map from key string to { status, count } to ensure same inputs
 * always give same output within a session (and across repeated calls).
 */
const _cache = new Map();

/**
 * The train data index from corridor.json — set once at load.
 * Maps trainNumber → train object (with stops array).
 * @type {Map<string, object>}
 */
let _trainIndex = null;

/**
 * Initialise the mock seat provider with corridor data.
 * Must be called once before getLegStatus.
 * @param {{ trains: Array<object> }} corridorData
 */
export function initMockSeats(corridorData) {
  _trainIndex = new Map();
  for (const train of corridorData.trains) {
    _trainIndex.set(train.number, train);
  }
}

/**
 * Get the simulated seat status for a train leg.
 *
 * @param {{ trainNumber: string, originStartDate: string, classCode: string, fromCode: string, toCode: string }} params
 * @returns {{ status: "AVL"|"RAC"|"WL", count: number, simulated: true }}
 */
export function getLegStatus({ trainNumber, originStartDate, classCode, fromCode, toCode }) {
  // Demo override: SSM→NDLS direct trains always WL
  if (
    DEMO_FORCE_WL.has(trainNumber) &&
    fromCode === 'SSM' &&
    toCode === 'NDLS'
  ) {
    return { status: 'WL', count: 45, simulated: true };
  }

  const cacheKey = `${trainNumber}|${originStartDate}|${classCode}|${fromCode}|${toCode}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  if (!_trainIndex) {
    throw new Error('initMockSeats() must be called before getLegStatus()');
  }

  const train = _trainIndex.get(trainNumber);
  if (!train) return { status: 'WL', count: 60, simulated: true };

  // Find the from and to indices in the train's stops array
  const stops = train.stops;
  const fromIdx = stops.findIndex((s) => s.code === fromCode);
  const toIdx = stops.findIndex((s) => s.code === toCode);

  if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) {
    return { status: 'WL', count: 60, simulated: true };
  }

  // Number of intervals = number of stop-to-stop segments in the WHOLE train
  // (not just the leg), so the per-leg result is consistent regardless of the
  // leg endpoints.  We pick the intervals that cover [fromIdx, toIdx).
  const numIntervals = stops.length - 1;
  const allIntervals = generateIntervals(trainNumber, originStartDate, classCode, numIntervals);

  // Extract only the intervals covered by this leg
  const legIntervals = allIntervals.slice(fromIdx, toIdx);

  const result = { ...worstInterval(legIntervals), simulated: true };
  _cache.set(cacheKey, result);
  return result;
}

