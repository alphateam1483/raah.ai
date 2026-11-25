import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDateUTC } from '../lib/time.js';
import { buildStationIndex } from '../lib/search.js';
import { initMockSeats } from '../lib/mockSeats.js';
import { getAccessOptions } from '../lib/access.js';

describe('Access Unit Tests (Phase 2b)', () => {
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

  // 1. Ordering: sorted by latest arrival that is still safe
  it('1. Ordering: trains are sorted by latest arrival that is still safe', () => {
    const journeyDate = parseDateUTC('2026-11-12');
    // Onward departure at 23:00 from MGS
    const onwardDep = new Date(Date.UTC(2026, 10, 12, 23, 0));

    const res = getAccessOptions(
      {
        origin: 'SSM',
        nearbyCode: 'MGS',
        onwardDepartureTime: onwardDep,
        onwardTrainNumber: '99999', // dummy
        journeyDate,
        earliestMin: 0,
        minGapMin: 120,
        classCode: '3A',
        includeRAC: false,
      },
      corridorData,
      stationIndex
    );

    expect(res.trains.length).toBeLessThanOrEqual(3);
    for (let i = 0; i < res.trains.length - 1; i++) {
      expect(res.trains[i].arrTime.getTime()).toBeGreaterThanOrEqual(
        res.trains[i + 1].arrTime.getTime()
      );
    }
  });

  // 2. Gap filter: all options arrive at least minGap before onward departure
  it('2. Gap filter: each train arrives at least minGapMin before onward train', () => {
    const journeyDate = parseDateUTC('2026-11-12');
    const onwardDep = new Date(Date.UTC(2026, 10, 12, 20, 0));
    const minGapMin = 120;

    const res = getAccessOptions(
      {
        origin: 'SSM',
        nearbyCode: 'MGS',
        onwardDepartureTime: onwardDep,
        onwardTrainNumber: '99999',
        journeyDate,
        earliestMin: 0,
        minGapMin,
        classCode: '3A',
        includeRAC: false,
      },
      corridorData,
      stationIndex
    );

    for (const t of res.trains) {
      expect(t.waitMin).toBeGreaterThanOrEqual(minGapMin);
      expect(t.arrTime.getTime()).toBeLessThanOrEqual(
        onwardDep.getTime() - minGapMin * 60000
      );
    }
  });

  // 3. Same-train exclusion: onward train is never offered as reach train
  it('3. Same-train exclusion: onward train is excluded from access options', () => {
    const journeyDate = parseDateUTC('2026-11-12');
    const onwardDep = new Date(Date.UTC(2026, 10, 12, 23, 0));
    const onwardTrainNumber = '12801'; // Purushottam

    const res = getAccessOptions(
      {
        origin: 'SSM',
        nearbyCode: 'MGS',
        onwardDepartureTime: onwardDep,
        onwardTrainNumber,
        journeyDate,
        earliestMin: 0,
        minGapMin: 60,
        classCode: '3A',
        includeRAC: true,
      },
      corridorData,
      stationIndex
    );

    const hasSame = res.trains.some((t) => t.trainNumber === onwardTrainNumber);
    expect(hasSame).toBe(false);
  });

  // 4. Confirmed-only: all returned train legs have AVL status (or RAC if allowed)
  it('4. Confirmed-only: every returned train option has a confirmed seat', () => {
    const journeyDate = parseDateUTC('2026-11-12');
    const onwardDep = new Date(Date.UTC(2026, 10, 12, 23, 0));

    const resAVLOnly = getAccessOptions(
      {
        origin: 'SSM',
        nearbyCode: 'MGS',
        onwardDepartureTime: onwardDep,
        onwardTrainNumber: '99999',
        journeyDate,
        earliestMin: 0,
        minGapMin: 60,
        classCode: '3A',
        includeRAC: false,
      },
      corridorData,
      stationIndex
    );

    for (const t of resAVLOnly.trains) {
      expect(t.seat.status).toBe('AVL');
    }
  });

  // 5. Road option is always included with estimated label and distance
  it('5. Road option is always included with estimated label and distance', () => {
    const journeyDate = parseDateUTC('2026-11-12');
    const onwardDep = new Date(Date.UTC(2026, 10, 12, 18, 0));

    const res = getAccessOptions(
      {
        origin: 'SSM',
        nearbyCode: 'MGS',
        onwardDepartureTime: onwardDep,
        onwardTrainNumber: '99999',
        journeyDate,
        earliestMin: 0,
        minGapMin: 120,
        classCode: '3A',
        includeRAC: false,
      },
      corridorData,
      stationIndex
    );

    expect(res.road).toBeDefined();
    expect(res.road.type).toBe('road');
    expect(res.road.roadKm).toBeGreaterThan(0);
    expect(res.road.label).toContain('estimated');
    expect(res.allOptions.length).toBeGreaterThanOrEqual(1);
  });
});

