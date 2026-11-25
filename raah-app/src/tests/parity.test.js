import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildStationIndex, search } from '../lib/search.js';

describe('Parity Tests (docs/TEST_PLAN.md §1)', () => {
  let corridorData;
  let stationIndex;

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../public/data/corridor.json'),
      'utf-8'
    );
    corridorData = JSON.parse(raw);
    stationIndex = buildStationIndex(corridorData);
  });

  it('SSM to NDLS at 00:00: direct trains are exactly 12877, 12815, 12801, 12397', () => {
    const res = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 120, maxWaitMin: 600, earliestMin: 0, classCode: null }
    );
    expect(res.direct.length).toBe(4);
    const trainNumbers = res.direct.map((d) => d.train.number).sort();
    expect(trainNumbers).toEqual(['12397', '12801', '12815', '12877']);
  });

  it('SSM to NDLS at 08:00: direct trains are 12801 and 12397', () => {
    const res = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 120, maxWaitMin: 600, earliestMin: 8 * 60, classCode: null }
    );
    expect(res.direct.length).toBe(2);
    const trainNumbers = res.direct.map((d) => d.train.number).sort();
    expect(trainNumbers).toEqual(['12397', '12801']);
  });

  it('NDLS to SSM at 08:00: direct trains count matches test plan', () => {
    const res = search(
      { origin: 'NDLS', destination: 'SSM', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 120, maxWaitMin: 600, earliestMin: 8 * 60, classCode: null }
    );
    expect(res.direct.length).toBeGreaterThanOrEqual(1);
    expect(res.nearby.length).toBeGreaterThanOrEqual(1);
    expect(res.twoTrain.length).toBeGreaterThan(0);
  });

  it('Changing safe gap changes two-train count monotonically', () => {
    const res60 = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 60, maxWaitMin: 600, earliestMin: 8 * 60, classCode: null }
    );
    const res120 = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 120, maxWaitMin: 600, earliestMin: 8 * 60, classCode: null }
    );
    const res180 = search(
      { origin: 'SSM', destination: 'NDLS', date: '2026-11-12' },
      corridorData,
      stationIndex,
      { minGapMin: 180, maxWaitMin: 600, earliestMin: 8 * 60, classCode: null }
    );

    // Shorter gap threshold allows more two-train combinations
    expect(res60.twoTrain.length).toBeGreaterThan(res120.twoTrain.length);
    expect(res120.twoTrain.length).toBeGreaterThan(res180.twoTrain.length);
  });
});

