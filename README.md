# Raah.ai

**Seat nahi? Raah hai na.**

Prototype of a train journey planner that finds routes with confirmed seats when direct trains are full. It checks direct trains, then trains from nearby stations (within 200 km), then two-train journeys with a safe waiting gap. It only plans. Booking happens on IRCTC.

> **Prototype status.** The timetable is a 2016 sample (DataMeet, CC0). Seat availability is **simulated**. Nothing here is live data.

## Folder map

```
AGENTS.md                  rules for the coding agent
README.md                  this file
docs/
  ANTIGRAVITY_PROMPT.md    first message to paste into Antigravity
  PRD.md                   product requirements
  TRD.md                   technical requirements and algorithm
  DATA_SPEC.md             corridor.json schema, provenance, known data issues
  SEAT_MOCK_SPEC.md        simulated seat availability
  UX_SPEC.md               screens, states, microcopy
  DESIGN_SYSTEM.md         palette, contrast, components, logo usage
  TEST_PLAN.md             parity numbers and acceptance tests
  DATA_ACCESS_PLAN.md      how to get real availability later
  PITCH_FIXES.md           corrections needed in the pitch
data/
  corridor.json            54 stations, 716 trains (379 KB)
  DATAMEET_README.md     original DataMeet README (license CC0)
reference/
  search.py                tested reference search (port this to JS)
  build_corridor.py        rebuilds corridor.json from DataMeet
assets/                    logos (transparent) and app icon
src/styles/tokens.css      design tokens
```

## What is real and what is fake

| Item | Status |
|---|---|
| Station names, coordinates | Real (DataMeet 2016) |
| Train numbers, names, halts, times | Real but **old (2016)**; timings and trains have changed |
| Days of run | Unknown for most trains; 17 have an unverified list |
| Road time to nearby stations | **Estimated** (straight line x 1.35 at 40 km/h) |
| Seat availability | **Simulated** |
| Fares, delays, live status | Not included |

## Try the reference search

```bash
python3 -I reference/search.py data/corridor.json SSM NDLS 2026-11-12 120 600 08:00
# args: file FROM TO DATE [min_gap_min] [max_wait_min] [earliest HH:MM]
```

## Rebuild the data

```bash
git clone https://github.com/datameet/railways
python3 -I reference/build_corridor.py railways <days_json> out_dir
```

## Start building

Open this folder in Antigravity and paste the message from `docs/ANTIGRAVITY_PROMPT.md`.
