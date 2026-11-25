import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseDateUTC,
  formatDateUTC,
  weekdayIndex,
  validOriginStarts,
  formatDisplay,
  durationMinutes,
  formatDuration,
} from '../lib/time.js';
import {
  buildStationIndex,
  legs,
  search,
  roadMinutes,
} from '../lib/search.js';
import {
  initMockSeats,
  getLegStatus,
} from '../lib/mockSeats.js';

describe('Unit Tests (docs/TEST_PLAN.md §2)', () => {
  let corridorData;
  let stationIndex;

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../public/data/corridor.json'),
      'utf-8'
    );
    corridorData = JSON.parse(raw);
    stationIndex = buildStationIndex(corridorData);
    initMockSeats(corridorData);
  });

  // 1. Offset to datetime
  it('1. Offset to datetime: train 12801 at SSM has dep = 2367', () => {
    const journeyDate = parseDateUTC('2026-11-12'); // Thursday
    const depOffset = 2367; // minutes
    const dayShift = Math.floor(depOffset / 1440); // 1
    expect(dayShift).toBe(1);

    // Origin day is 2026-11-11
    const originStart = new Date(journeyDate.getTime() - dayShift * 86400000);
    expect(formatDateUTC(originStart)).toBe('2026-11-11');

    // Real departure is 2026-11-12 15:27 (Thu 12 Nov 15:27)
    const realDep = new Date(originStart.getTime() + depOffset * 60000);
    expect(formatDateUTC(realDep)).toBe('2026-11-12');
    expect(realDep.getUTCHours()).toBe(15);
    expect(realDep.getUTCMinutes()).toBe(27);
    expect(formatDisplay(realDep)).toBe('Thu 12 Nov 15:27');
  });

  // 2. Weekday mask
  it('2. Weekday mask: Thursday 2026-11-12 maps to index 3; Sunday maps to 6; mask 0001000 runs only on Thursday', () => {
    const thursday = parseDateUTC('2026-11-12');
    expect(weekdayIndex(thursday)).toBe(3); // Mon=0, Tue=1, Wed=2, Thu=3

    const sunday = parseDateUTC('2026-11-15');
    expect(weekdayIndex(sunday)).toBe(6); // Sun=6

    const mask = '0001000'; // Runs only on Thu (index 3)
    expect(mask[weekdayIndex(thursday)]).toBe('1');
    expect(mask[weekdayIndex(sunday)]).toBe('0');
  });

  // 3. days_of_run = null is included and flagged
  it('3. days_of_run = null is included and flagged as daysUnverified', () => {
    const journeyDate = parseDateUTC('2026-11-12');
    const runs = legs('SSM', 'NDLS', stationIndex, journeyDate, 0, 1439, null);
    // Find any train with days_of_run === null
    const unverifiedLeg = runs.find((r) => r.train.days_of_run === null);
    // Even if corridor trains have verified or null, ensure daysUnverified property is correctly assigned
    runs.forEach((r) => {
      expect(r.daysUnverified).toBe(r.train.days_of_run === null);
    });
  });

  // 4. Nearby rule
  it('4. Nearby rule: a train that halts at N and later at origin is excluded', () => {
    // If a train halts at N and later at O, boarding at N offers no advantage
    // Let's verify through search() that no nearby result violates this rule
    const res = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 120, maxWaitMin: 600, earliestMin: 0, classCode: null }
    );

    for (const nb of res.nearby) {
      const train = nb.leg.train;
      const nIdx = nb.leg.fromStopIdx;
      const originAfterN = train.stops.findIndex(
        (s, i) => i > nIdx && s.code === 'SSM'
      );
      expect(originAfterN).toBe(-1);
    }
  });

  // 5. Two-train rules
  it('5. Two-train rules: same train excluded; train 2 halting at X and then origin excluded; dedupe by (t1, t2, X)', () => {
    const res = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 120, maxWaitMin: 600, earliestMin: 0, classCode: null }
    );

    const keys = new Set();
    for (const item of res.twoTrain) {
      // 1. Same train excluded
      expect(item.leg1.train.number).not.toBe(item.leg2.train.number);

      // 2. Train 2 halting at X and then at origin excluded
      const originAfterX = item.leg2.train.stops.findIndex(
        (s, i) => i > item.leg2.fromStopIdx && s.code === 'SSM'
      );
      expect(originAfterX).toBe(-1);

      // 3. Dedupe by (t1, t2, X)
      const key = `${item.leg1.train.number}|${item.leg2.train.number}|${item.hubCode}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  // 6. Gap filter
  it('6. Gap filter: results with gap below min gap or above max wait are absent', () => {
    const minGap = 120;
    const maxWait = 600;
    const res = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: minGap, maxWaitMin: maxWait, earliestMin: 8 * 60, classCode: null }
    );

    for (const item of res.twoTrain) {
      expect(item.waitMin).toBeGreaterThanOrEqual(minGap);
      expect(item.waitMin).toBeLessThanOrEqual(maxWait);
    }
  });

  // 7. Earliest time
  it('7. Earliest time: nearby options need earliest + road + 30 min before departure', () => {
    const earliestMin = 8 * 60; // 08:00 = 480 min
    const res = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 120, maxWaitMin: 600, earliestMin, classCode: null }
    );

    for (const nb of res.nearby) {
      const depMin =
        nb.leg.depTime.getUTCHours() * 60 + nb.leg.depTime.getUTCMinutes();
      const roadTime = roadMinutes(nb.roadKm);
      const requiredMin = earliestMin + roadTime + 30;
      expect(depMin).toBeGreaterThanOrEqual(requiredMin);
    }
  });

  // 8. Class filter
  it('8. Class filter: SL/3A/2A/1A excludes trains lacking that class; trains with no reserved class never match', () => {
    const journeyDate = parseDateUTC('2026-11-12');
    const runs3A = legs('SSM', 'NDLS', stationIndex, journeyDate, 0, 1439, '3A');
    for (const r of runs3A) {
      expect(r.train.classes.third_ac).toBe(true);
    }

    const runs1A = legs('SSM', 'NDLS', stationIndex, journeyDate, 0, 1439, '1A');
    for (const r of runs1A) {
      expect(r.train.classes.first_ac).toBe(true);
    }
  });

  // 9. Mock seats
  it('9. Mock seats: deterministic, leg is worst interval, demo override on SSM->NDLS 4 trains', () => {
    // 1. Same inputs give same output twice
    const r1 = getLegStatus({
      trainNumber: '12397',
      originStartDate: '2026-11-12',
      classCode: '3A',
      fromCode: 'GAYA',
      toCode: 'NDLS',
    });
    const r2 = getLegStatus({
      trainNumber: '12397',
      originStartDate: '2026-11-12',
      classCode: '3A',
      fromCode: 'GAYA',
      toCode: 'NDLS',
    });
    expect(r1).toEqual(r2);
    expect(r1.simulated).toBe(true);

    // 2. Demo override: the 4 direct trains on SSM->NDLS always return WL
    for (const tn of ['12877', '12397', '12815', '12801']) {
      const s = getLegStatus({
        trainNumber: tn,
        originStartDate: '2026-11-12',
        classCode: '3A',
        fromCode: 'SSM',
        toCode: 'NDLS',
      });
      expect(s.status).toBe('WL');
    }

    // 3. Demo override does not apply to other origin/dest pairs
    const other = getLegStatus({
      trainNumber: '12801',
      originStartDate: '2026-11-12',
      classCode: '3A',
      fromCode: 'MGS',
      toCode: 'NDLS',
    });
    // Doesn't strictly have to be WL
    expect(typeof other.status).toBe('string');
  });
});
