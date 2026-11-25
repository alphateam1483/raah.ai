# Simulated Seat Availability

Seat data is **fake** in the prototype. It must be deterministic, clearly labeled, and isolated so a real provider can replace it.

## 1. Rules

- Key: `(trainNumber, originStartDate as YYYY-MM-DD, classCode)`.
- Seeded pseudo-random generator (for example mulberry32) seeded by hashing the key. Same input gives the same output on every reload.
- For each interval between consecutive stops of the train (as listed in `corridor.json`) generate one status:
  - AVAILABLE `AVL n`, 60% chance, n from 1 to 40
  - RAC `RAC n`, 10% chance, n from 1 to 12
  - WAITING LIST `WL n`, 30% chance, n from 1 to 60
- **A leg's status is the worst interval it covers**: any WL gives WL (largest number); otherwise any RAC gives RAC; otherwise AVL (smallest count).
- Effect: long legs are usually full, short legs often have seats. This matches how real availability behaves, since a seat free over a long segment is also free over any part of it.

## 2. Demo override

For SSM to NDLS, the four direct trains (12877, 12397, 12815, 12801) always return `WL` in demo mode so the story "direct is full, Raah finds a way" holds. Keep this override in a single clearly named constant (`DEMO_FORCE_WL`). It must not apply to any other pair.

## 3. Interface

```js
getLegStatus({ trainNumber, originStartDate, classCode, fromCode, toCode })
// returns { status: "AVL" | "RAC" | "WL", count: number, simulated: true }
```

`classCode` is one of `SL`, `3A`, `2A`, `1A`. The module must not touch the network.

## 4. Display

- Every card shows the word **Simulated** next to its seat badges.
- The banner "Prototype: sample 2016 timetable and SIMULATED seat availability" is always visible.

## 5. Tuning

If the default demo (SSM to NDLS, 3A, 2026-11-12) shows fewer than 3 confirmed alternatives, raise the AVL probability in one constant. Do not hard-code specific results.

## 6. Replacement plan

A real provider implements the same function and returns `simulated: false`. Because real calls are slow and limited, the search must request availability lazily: sort candidates by time first, then check availability until 10 confirmed options are found (see `docs/DATA_ACCESS_PLAN.md`).
