/**
 * search.js — port of reference/search.py to JavaScript.
 *
 * Algorithm (TRD §4):
 *   1. legs(a, b)  — every train stopping at a and later at b, with real datetimes.
 *   2. Direct      — legs(O, D) with dep in [earliest, end of day].
 *   3. Nearby      — for each N in nearby[O]: road leg first, then legs(N, D)
 *                    skipping trains that also halt at O after N.
 *   4. Two trains  — for each hub X: legs(O, X) × legs(X, D) with gap rules,
 *                    skip/dedupe rules.
 *   5. Seat filter — keep only options where every leg is AVL (or RAC if toggled).
 *   6. Sort & cap  — 10 per tab.
 *
 * Time convention: UTC Date objects throughout.  Road buffer = 30 min.
 */

import { parseDateUTC, validOriginStarts, weekdayIndex, formatDateUTC } from './time.js';
import { getLegStatus } from './mockSeats.js';

/** Road buffer added to road time for nearby-station option (minutes). */
const ROAD_BUFFER_MIN = 30;

/**
 * Estimate road minutes between two stations.
 * Formula from TRD §4: km * 1.35 / 40 * 60
 * @param {number} km
 * @returns {number}
 */
export function roadMinutes(km) {
  return Math.round((km * 1.35 / 40) * 60);
}

/**
 * Build an index: stationCode → [{train, stopIndex}]
 * Called once at load for performance (TRD §5).
 * @param {object} corridorData
 * @returns {Map<string, Array<{train: object, stopIndex: number}>>}
 */
export function buildStationIndex(corridorData) {
  const index = new Map();
  for (const train of corridorData.trains) {
    for (let i = 0; i < train.stops.length; i++) {
      const code = train.stops[i].code;
      if (!index.has(code)) index.set(code, []);
      index.get(code).push({ train, stopIndex: i });
    }
  }
  return index;
}

/**
 * Map classCode to the corridor.json classes key.
 * @param {string} classCode  "SL"|"3A"|"2A"|"1A"
 * @returns {string}
 */
function classKey(classCode) {
  const map = { SL: 'sleeper', '3A': 'third_ac', '2A': 'second_ac', '1A': 'first_ac' };
  return map[classCode] || null;
}

/**
 * legs(a, b, stationIndex, journeyDate, earliestMin, latestMin)
 *
 * Returns every run of every train that halts at station a and later at station b,
 * where the real departure at a falls in [earliestMin, latestMin] minutes-of-day
 * and the train runs on the journey date (days_of_run check).
 *
 * @param {string} aCode
 * @param {string} bCode
 * @param {Map}    stationIndex
 * @param {Date}   journeyDate     — UTC midnight
 * @param {number} earliestMin     — minutes since midnight (0 = 00:00)
 * @param {number} latestMin       — minutes since midnight (usually 1439 = 23:59)
 * @param {string} classCode       — "SL"|"3A"|"2A"|"1A"  (null = no filter)
 * @returns {Array<LegResult>}
 */
export function legs(aCode, bCode, stationIndex, journeyDate, earliestMin = 0, latestMin = 1439, classCode = null) {
  const aEntries = stationIndex.get(aCode) || [];
  const results = [];
  const ck = classCode ? classKey(classCode) : null;

  for (const { train, stopIndex: aIdx } of aEntries) {
    // Does this train also stop at b after a?
    const bIdx = train.stops.findIndex((s, i) => i > aIdx && s.code === bCode);
    if (bIdx === -1) continue;

    // Class filter
    if (ck && !train.classes[ck]) continue;

    const aStop = train.stops[aIdx];
    const bStop = train.stops[bIdx];

    const daysOfRun = train.days_of_run ?? null;

    // Try origin start shifts
    const candidateStarts = validOriginStarts(aStop.dep, journeyDate, daysOfRun);

    for (const { originStart, realTime: depTime } of candidateStarts) {
      // Departure must be on the journey date (UTC calendar day)
      const depDateStr = formatDateUTC(depTime);
      const journeyDateStr = formatDateUTC(journeyDate);
      if (depDateStr !== journeyDateStr) continue;

      // Departure must be in [earliest, latest] on the journey date
      const depMinOfDay = depTime.getUTCHours() * 60 + depTime.getUTCMinutes();
      if (depMinOfDay < earliestMin || depMinOfDay > latestMin) continue;

      // Arrival time
      const arrTime = new Date(originStart.getTime() + bStop.arr * 60000);

      results.push({
        train,
        originStart,
        originStartDate: formatDateUTC(originStart),
        depTime,
        arrTime,
        fromCode: aCode,
        toCode: bCode,
        fromStopIdx: aIdx,
        toStopIdx: bIdx,
        daysUnverified: train.days_of_run === null,
      });
    }
  }

  return results;
}

/**
 * Search options for the search function.
 * @typedef {{
 *   minGapMin?: number,      // minimum gap between trains (default 120)
 *   maxWaitMin?: number,     // maximum wait between trains (default 600)
 *   earliestMin?: number,    // earliest departure in minutes of day (default 0)
 *   includeRAC?: boolean,    // include RAC as confirmed (default false)
 *   classCode?: string,      // "SL"|"3A"|"2A"|"1A" (default "3A")
 * }} SearchOptions
 */

/**
 * Run the full Raah search.
 *
 * @param {{ origin: string, destination: string, date: string }} query
 * @param {object}      corridorData
 * @param {Map}         stationIndex
 * @param {SearchOptions} options
 * @returns {{ direct: LegResult[], nearby: NearbyResult[], twoTrain: TwoTrainResult[] }}
 */
export function search(query, corridorData, stationIndex, options = {}) {
  const {
    minGapMin = 120,
    maxWaitMin = 600,
    earliestMin = 0,
    includeRAC = false,
    classCode = '3A',
  } = options;

  const { origin, destination, date } = query;
  const journeyDate = parseDateUTC(date);
  const latestMin = 1439;

  // ── 1. Direct trains ──────────────────────────────────────────────────────
  const directLegs = legs(origin, destination, stationIndex, journeyDate, earliestMin, latestMin, classCode);

  // ── 2. Nearby station options ─────────────────────────────────────────────
  const nearbyStations = corridorData.nearby[origin] || [];
  const nearbyResults = [];

  for (const { code: nCode, km } of nearbyStations) {
    if (nCode === destination) continue;

    const roadMin = roadMinutes(km);
    // Earliest departure at N = earliest + road + buffer
    const nearbyEarliest = earliestMin + roadMin + ROAD_BUFFER_MIN;

    const nearbyLegs = legs(nCode, destination, stationIndex, journeyDate, nearbyEarliest, latestMin, classCode);

    for (const leg of nearbyLegs) {
      // Skip if this train also halts at origin AFTER n (you'd just board at origin)
      // TRD §4.3: "skip if the train halts at N and then also at O"
      // i.e., skip if train halts at origin at a stop index AFTER leg's fromStopIdx
      const originAfterN = leg.train.stops.findIndex(
        (s, i) => i > leg.fromStopIdx && s.code === origin
      );
      if (originAfterN !== -1) continue;

      nearbyResults.push({
        type: 'nearby',
        nearbyCode: nCode,
        nearbyName: corridorData.stations[nCode]?.name || nCode,
        roadKm: km,
        roadMin,
        leg,
      });
    }
  }

  // ── 3. Two-train options ──────────────────────────────────────────────────
  // For every hub X (not origin, not destination):
  const twoTrainResults = [];
  const twoTrainSeen = new Map(); // key (t1, t2, X) → best arrTime

  const allStationCodes = Object.keys(corridorData.stations);

  for (const xCode of allStationCodes) {
    if (xCode === origin || xCode === destination) continue;

    const leg1List = legs(origin, xCode, stationIndex, journeyDate, earliestMin, latestMin, classCode);

    for (const leg1 of leg1List) {
      // Window for leg2 departure: [arr1 + minGap, arr1 + maxWait]
      const leg2EarliestMs = leg1.arrTime.getTime() + minGapMin * 60000;
      const leg2LatestMs = leg1.arrTime.getTime() + maxWaitMin * 60000;

      // We search leg2 on the same journey date and also the next day
      // (since arr1 could be late night and leg2 departs next day)
      // We do this by directly searching a wider window and filtering by time:
      for (const jDateOffset of [0, 1]) {
        const jDate = new Date(journeyDate.getTime() + jDateOffset * 86400000);
        const leg2List = legs(xCode, destination, stationIndex, jDate, 0, 1439, classCode);

        for (const leg2 of leg2List) {
          const dep2Ms = leg2.depTime.getTime();

          if (dep2Ms < leg2EarliestMs || dep2Ms > leg2LatestMs) continue;

          // Skip if train 2 halts at X then also halts at origin (after X)
          const originAfterX = leg2.train.stops.findIndex(
            (s, i) => i > leg2.fromStopIdx && s.code === origin
          );
          if (originAfterX !== -1) continue;

          // Skip if same train
          if (leg1.train.number === leg2.train.number) continue;

          // Dedupe by (t1, t2, X) keeping earliest arrival
          const dedupeKey = `${leg1.train.number}|${leg2.train.number}|${xCode}`;
          const existing = twoTrainSeen.get(dedupeKey);
          if (existing !== undefined && existing <= leg2.arrTime.getTime()) continue;
          twoTrainSeen.set(dedupeKey, leg2.arrTime.getTime());

          // Replace any existing entry with same key
          const existingIdx = twoTrainResults.findIndex(
            (r) => r._dedupeKey === dedupeKey
          );
          const entry = {
            type: 'twoTrain',
            hubCode: xCode,
            hubName: corridorData.stations[xCode]?.name || xCode,
            leg1,
            leg2,
            waitMin: Math.round((dep2Ms - leg1.arrTime.getTime()) / 60000),
            _dedupeKey: dedupeKey,
          };
          if (existingIdx !== -1) {
            twoTrainResults[existingIdx] = entry;
          } else {
            twoTrainResults.push(entry);
          }
        }
      }
    }
  }

  return {
    direct: directLegs,
    nearby: nearbyResults,
    twoTrain: twoTrainResults,
  };
}

/**
 * Apply seat filter to search results.
 * Keeps only options where every leg is AVL (or RAC if includeRAC is true).
 *
 * @param {{ direct: LegResult[], nearby: NearbyResult[], twoTrain: TwoTrainResult[] }} results
 * @param {{ includeRAC: boolean, classCode: string }} options
 * @returns {same shape, filtered}
 */
export function applySeats(results, { includeRAC = false, classCode = '3A' }) {
  function legOk(leg) {
    const seat = getLegStatus({
      trainNumber: leg.train.number,
      originStartDate: leg.originStartDate,
      classCode,
      fromCode: leg.fromCode,
      toCode: leg.toCode,
    });
    leg._seat = seat; // attach for display
    if (seat.status === 'AVL') return true;
    if (includeRAC && seat.status === 'RAC') return true;
    return false;
  }

  // Direct: always show, but attach seat status
  const direct = results.direct.map((leg) => {
    getLegStatus({
      trainNumber: leg.train.number,
      originStartDate: leg.originStartDate,
      classCode,
      fromCode: leg.fromCode,
      toCode: leg.toCode,
    });
    // Re-call to attach
    const seat = getLegStatus({
      trainNumber: leg.train.number,
      originStartDate: leg.originStartDate,
      classCode,
      fromCode: leg.fromCode,
      toCode: leg.toCode,
    });
    return { ...leg, _seat: seat };
  });

  const nearby = results.nearby.filter((r) => legOk(r.leg));
  const twoTrain = results.twoTrain.filter((r) => legOk(r.leg1) && legOk(r.leg2));

  return { direct, nearby, twoTrain };
}

/**
 * Sort and cap results (10 per tab).
 *
 * @param {Array}  items
 * @param {string} sortBy  "earliest-arrival"|"shortest-time"|"least-road"
 * @param {number} cap
 * @returns {Array}
 */
export function sortAndCap(items, sortBy = 'earliest-arrival', cap = 10) {
  const sorted = [...items].sort((a, b) => {
    if (sortBy === 'earliest-arrival') {
      const aArr = a.type === 'twoTrain' ? a.leg2.arrTime : a.leg?.arrTime || a.arrTime;
      const bArr = b.type === 'twoTrain' ? b.leg2.arrTime : b.leg?.arrTime || b.arrTime;
      return aArr - bArr;
    }
    if (sortBy === 'shortest-time') {
      const aDep = a.type === 'twoTrain' ? a.leg1.depTime : a.leg?.depTime || a.depTime;
      const aArr = a.type === 'twoTrain' ? a.leg2.arrTime : a.leg?.arrTime || a.arrTime;
      const bDep = b.type === 'twoTrain' ? b.leg1.depTime : b.leg?.depTime || b.depTime;
      const bArr = b.type === 'twoTrain' ? b.leg2.arrTime : b.leg?.arrTime || b.arrTime;
      // For nearby, add road time
      const aRoad = a.type === 'nearby' ? (a.roadMin || 0) : 0;
      const bRoad = b.type === 'nearby' ? (b.roadMin || 0) : 0;
      return (aArr - aDep + aRoad * 60000) - (bArr - bDep + bRoad * 60000);
    }
    if (sortBy === 'least-road') {
      const aRoad = a.type === 'nearby' ? (a.roadMin || 0) : 0;
      const bRoad = b.type === 'nearby' ? (b.roadMin || 0) : 0;
      return aRoad - bRoad;
    }
    return 0;
  });
  return sorted.slice(0, cap);
}

