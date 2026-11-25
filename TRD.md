# Raah.ai: Technical Requirements (Prototype)

## 1. Architecture

Static single-page app. No backend, no database, no auth.

```
index.html
src/
  main.jsx            app shell
  lib/time.js         date and offset helpers (UTC arithmetic only)
  lib/search.js       port of reference/search.py  (the core)
  lib/mockSeats.js    simulated seat provider (isolated, replaceable)
  components/         SearchForm, StationPicker, ResultCard, Timeline, SeatBadge, WaitBadge, Banner
  styles/tokens.css   design tokens
public/data/corridor.json
```

Suggested stack: Vite + React (JavaScript is fine; JSDoc types optional). No UI framework dependency is required. Ask before adding any dependency.

## 2. Data contract

`corridor.json` (379 KB): `{meta, stations, nearby, trains}`. Full schema and provenance in `docs/DATA_SPEC.md`. Key points:

- `trains[].stops[]` = real halts at corridor stations only, with `arr` and `dep` in **minutes since 00:00 on the calendar day the train leaves its origin** (1440 = 00:00 the next day).
- `days_of_run` is a Mon..Sun bitmask or `null` (unknown, treat as running).
- `nearby[code]` = stations within 200 km (straight line) sorted by distance.

## 3. Time handling

- Do all date math in **UTC** with `Date.UTC`, and format with `timeZone: "UTC"`. This avoids browser timezone bugs. India has no daylight saving.
- Origin start (midnight of the origin day) = journey date minus `floor(dep / 1440)` days, where `dep` is the offset at the boarding station. Real time = origin start + offset minutes. Try shifts -1, 0, +1, +2 days (as in `reference/search.py`).
- Weekday index: Monday = 0. In JS: `(date.getUTCDay() + 6) % 7`. Mask applies to the date the train leaves its origin.
- Real departure = origin start + `dep` minutes; real arrival = origin start + `arr` minutes.

## 4. Search algorithm (port exactly)

Reference: `reference/search.py` (tested). Inputs: origin O, destination D, date, min gap (default 120), max wait (default 600), earliest minute of day (default 0), road buffer 30.

1. **legs(a, b)**: every train that halts at `a` and later at `b`, for each valid origin start date, with real dep/arr datetimes.
2. **Direct**: `legs(O, D)` where dep is between earliest and end of the day.
3. **Nearby**: for each N in `nearby[O]`: road minutes = `km * 1.35 / 40 * 60` (estimate). For each `legs(N, D)` run:
   - skip if the train halts at N and then also at O (just board at O);
   - require `dep >= earliest + road + 30 min`.
4. **Two trains**: for each station X other than O and D: for each `legs(O, X)` run with dep between earliest and end of day, for each `legs(X, D)` run with dep in `[arr1 + minGap, arr1 + maxWait]`:
   - skip if train 2 halts at X and then also at O;
   - skip if train 1 equals train 2;
   - dedupe by (train1, train2, X), keeping the earliest arrival.
5. **Seat filter** (after the above): keep only options where every leg has status AVL (RAC too if toggled), using `mockSeats.getLegStatus`.
6. **Sort and cap**: per tab, apply the chosen sort and keep 10.

Why the two skip rules: availability on a longer segment is a subset of a shorter one. Boarding *earlier* on a train that also passes the origin gives nothing, but boarding *later* can help when only the early section is full.

## 5. Performance

- Corridor has 716 trains and 54 stations. Naive two-train search scans trains per hub; fine in tens of milliseconds, but build an index `stationCode -> [{train, stopIndex}]` once at load.
- If a search exceeds 100 ms on a mid-range phone, move it to a Web Worker. Show a skeleton while running.
- Do not call the seat provider for options that will not be shown: filter by time and sort first when the provider becomes real (see DATA_ACCESS_PLAN).

## 6. Seat provider interface

```js
// Replaceable. The prototype implementation is src/lib/mockSeats.js
getLegStatus({ trainNumber, originStartDate, classCode, fromCode, toCode })
  -> { status: "AVL" | "RAC" | "WL", count: number, simulated: true }
```

Details in `docs/SEAT_MOCK_SPEC.md`. A real provider must return the same shape with `simulated: false`.

## 7. Error and edge cases

- `corridor.json` fails to load: show retry state.
- From equals To: block with an inline message.
- Train without the chosen class: excluded.
- Trains with no reserved class (about 247 of 716, mostly passenger/MEMU) never match a class filter.
- `days_of_run` null: include, show "days unverified".

## 8. Security and privacy

No accounts, no personal data, no analytics in the prototype. External link to IRCTC opens with `rel="noopener noreferrer"`.

## 9. Build and run

`npm create vite@latest` (React), `npm run dev`, `npm run build` (static output). Unit tests with Vitest. Parity tests in `docs/TEST_PLAN.md` must run with `npm test`.

## 10. Out of scope

Server code, real availability, authentication, payments, maps, internationalisation.
