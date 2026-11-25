/**
 * access.js — access options for nearby stations.
 *
 * For a "Nearby station" option with nearby station N and onward departure time T,
 * returns ways to reach N from the origin O:
 *   a. Train legs: trains that halt at O and later at N, arriving at least
 *      the user's safe gap before T, departing after earliest boarding time.
 *      Rules: not same train as onward train; skip train that halts at N and later at O;
 *      confirmed seats only (AVL, or RAC if includeRAC).
 *   b. Road: estimated (km * 1.35 at 40 km/h).
 *
 * Shows up to 3 train options plus road, sorted by latest arrival that is still safe.
 */

import { legs, roadMinutes } from './search.js';
import { getLegStatus } from './mockSeats.js';
import { formatDuration } from './time.js';

/**
 * Get ways to reach nearby station N from origin O.
 *
 * @param {object} params
 * @param {string} params.origin
 * @param {string} params.nearbyCode
 * @param {Date}   params.onwardDepartureTime
 * @param {string} params.onwardTrainNumber
 * @param {Date}   params.journeyDate
 * @param {number} [params.earliestMin=0]
 * @param {number} [params.minGapMin=120]
 * @param {string} [params.classCode='3A']
 * @param {boolean} [params.includeRAC=false]
 * @param {object} corridorData
 * @param {Map}    stationIndex
 * @returns {{ trains: Array, road: object, allOptions: Array }}
 */
export function getAccessOptions(
  {
    origin,
    nearbyCode,
    onwardDepartureTime,
    onwardTrainNumber,
    journeyDate,
    earliestMin = 0,
    minGapMin = 120,
    classCode = '3A',
    includeRAC = false,
  },
  corridorData,
  stationIndex
) {
  const T = onwardDepartureTime instanceof Date ? onwardDepartureTime : new Date(onwardDepartureTime);
  const cutoffMs = T.getTime() - minGapMin * 60000;

  // 1. Train legs from origin to nearby station
  // We check journeyDate (and day 0 if onward departs early next day)
  const candidateLegs = legs(
    origin,
    nearbyCode,
    stationIndex,
    journeyDate,
    earliestMin,
    1439,
    classCode
  );

  const validTrains = [];

  for (const leg of candidateLegs) {
    // Rule a: Not the same train as the onward train
    if (leg.train.number === onwardTrainNumber) continue;

    // Rule b: Arriving at least the user's safe gap before T
    if (leg.arrTime.getTime() > cutoffMs) continue;

    // Rule c: Skip if the train halts at N and then also at O (after N)
    const originAfterN = leg.train.stops.findIndex(
      (s, i) => i > leg.fromStopIdx && s.code === origin
    );
    if (originAfterN !== -1) continue;

    // Rule d: Mock seats status must be confirmed (AVL, or RAC if includeRAC)
    const seat = getLegStatus({
      trainNumber: leg.train.number,
      originStartDate: leg.originStartDate,
      classCode,
      fromCode: origin,
      toCode: nearbyCode,
    });

    const isConfirmed =
      seat.status === 'AVL' || (includeRAC && seat.status === 'RAC');
    if (!isConfirmed) continue;

    const waitMin = Math.round((T.getTime() - leg.arrTime.getTime()) / 60000);

    validTrains.push({
      id: `train-${leg.train.number}-${leg.originStartDate}`,
      type: 'train',
      mode: 'train',
      train: leg.train,
      trainNumber: leg.train.number,
      trainName: leg.train.name,
      depTime: leg.depTime,
      arrTime: leg.arrTime,
      fromCode: origin,
      toCode: nearbyCode,
      originStartDate: leg.originStartDate,
      seat,
      waitMin,
      daysUnverified: leg.daysUnverified,
    });
  }

  // Sort train options by latest arrival that is still safe (descending arrTime)
  validTrains.sort((a, b) => b.arrTime.getTime() - a.arrTime.getTime());

  // Keep up to 3 train options
  const topTrains = validTrains.slice(0, 3);

  // 2. Road option
  const nearbyEntry = (corridorData.nearby[origin] || []).find(
    (x) => x.code === nearbyCode
  );
  const roadKm = nearbyEntry ? nearbyEntry.km : 0;
  const roadMin = roadMinutes(roadKm);

  // Road arrival is T - 30m buffer; departure is roadArr - roadMin
  const roadArrTime = new Date(T.getTime() - 30 * 60000);
  const roadDepTime = new Date(roadArrTime.getTime() - roadMin * 60000);

  const roadOption = {
    id: `road-${origin}-${nearbyCode}`,
    type: 'road',
    mode: 'road',
    roadKm,
    roadMin,
    depTime: roadDepTime,
    arrTime: roadArrTime,
    waitMin: 30, // 30 min road buffer
    fromCode: origin,
    toCode: nearbyCode,
    label: `~${formatDuration(roadMin)} by road (estimated)`,
  };

  // When distance > 10 km, we must show train, NOT road.
  // Only include road if distance <= 10 km (short local intra-city transfer).
  const allOptions =
    roadKm > 10
      ? topTrains
      : topTrains.length > 0
        ? [...topTrains, roadOption]
        : [roadOption];

  return {
    trains: topTrains,
    road: roadOption,
    allOptions,
  };
}

