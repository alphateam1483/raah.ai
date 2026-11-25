# Test Plan

## 1. Parity tests (logic port must match `reference/search.py`)

Run on `data/corridor.json`, date 2026-11-12 (Thursday), no seat filter, max wait 600 min. Counts are rows produced before sorting and capping.

| From to To | Gap | Earliest | Direct | Nearby | Two-train |
|---|---|---|---|---|---|
| SSM to NDLS | 120 | 00:00 | 4 | 258 | 619 |
| SSM to NDLS | 120 | 08:00 | 2 | 237 | 317 |
| SSM to NDLS | 60 | 08:00 | 2 | 237 | 362 |
| SSM to NDLS | 180 | 08:00 | 2 | 237 | 264 |
| NDLS to SSM | 120 | 08:00 | 3 | 17 | 515 |

- SSM to NDLS at 00:00: direct trains are 12877 (dep 00:31), 12815 (dep 03:27), 12801 (dep 15:27), 12397 (dep 16:01).
- SSM to NDLS at 08:00: direct trains are 12801 (15:27 to Fri 04:50) and 12397 (16:01 to Fri 05:00).
- Reproduce with: `python3 -I reference/search.py data/corridor.json SSM NDLS 2026-11-12 120 600 08:00`.

## 2. Unit tests

1. Offset to datetime: train 12801 at SSM has `dep = 2367`. For journey date 2026-11-12, `floor(2367/1440) = 1`, so the origin day is 2026-11-11 and the real departure is 2026-11-12 15:27 (matches the reference output "Thu 12 Nov 15:27").
2. Weekday mask: Thursday 2026-11-12 maps to index 3; Sunday maps to 6; mask `"0001000"` runs only on Thursday.
3. `days_of_run = null` is included and flagged.
4. Nearby rule: a train that halts at N and later at the origin is excluded.
5. Two-train rules: same train excluded; train 2 halting at X and then at origin excluded; dedupe by (t1, t2, X).
6. Gap filter: results with gap below min gap or above max wait are absent.
7. Earliest time: nearby options need `earliest + road + 30 min` before departure.
8. Class filter: SL/3A/2A/1A excludes trains lacking that class; trains with no reserved class never match.
9. Mock seats: same inputs give the same output twice; leg status is the worst interval; demo override only affects the four SSM to NDLS direct trains.

## 3. UI acceptance tests

- Default search (SSM, NDLS, 2026-11-12, 08:00, 3A): both direct trains show WL; at least 3 confirmed alternatives appear.
- NDLS to SSM, PNBE to NDLS, GAYA to ALD, BSB to CNB all return results without errors.
- Changing the safe gap changes the two-train list.
- Swap button works. From equals To shows an error.
- Every card contains the word "Simulated"; the prototype banner is visible on every screen.
- No request other than the page assets and `corridor.json` appears in the browser network tab.

## 4. Visual and accessibility checks

- 360 px: no horizontal scroll, tap targets at least 44 px.
- All text meets contrast in `docs/DESIGN_SYSTEM.md`; violet is never used for text.
- Seat and wait badges have text and icons, not color only.
- Keyboard: all controls reachable, focus ring visible. Screen reader reads times as weekday plus clock.
- Reduced motion: animations off.

## 5. Manual verification of data (do before the demo)

Check 10 corridor trains against the current IRCTC/NTES timetable, including 12801, 12397, 12877 and 12815. Record the differences; the prototype data is from 2016.
