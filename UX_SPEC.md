# UX Specification

Mobile first. One page with two states: **Search** and **Results** (results appear below the form on desktop, replace it with an "Edit search" bar on mobile).

## 1. Header

Logo (`assets/raah-logo-white.png`, 28 px high) at left. Prototype banner directly below. Tagline "Seat nahi? Raah hai na." shown on the empty home state.

## 2. Search screen

| Field | Behavior |
|---|---|
| From | Searchable combobox, 54 stations. Match by name or code (prefix first, then contains). Shows "Sasaram (SSM)". Default Sasaram. |
| To | Same. Default New Delhi (NDLS). |
| Swap | Icon button between the fields. |
| Date | Date picker. Default 2026-11-12 (demo date; a Thursday). |
| Earliest boarding time | Time input, default 08:00. Help text: "Journeys you cannot reach in time are hidden." |
| Class | Chips SL / 3A / 2A / 1A, single select, default 3A. |
| Advanced (collapsed) | Safe gap between trains: 1h / 2h (default) / 3h / custom. Max wait: default 10h. Include RAC toggle (off). "3 trains" disabled with "coming soon". |
| Button | **Find my Raah** (primary, full width on mobile). |

Validation: From and To must differ ("Pick two different stations"). Date cannot be empty.

## 3. Results screen

Order of blocks:

1. **Summary line**: "Sasaram to New Delhi, Thu 12 Nov, 3A".
2. **Route Panel** (Phase 2b extension): Sits at the top of results. On 360 px screens, it is sticky and collapsible. Shows a vertical timeline for the selected journey (origin node, connecting line with mode & train details, intermediate node with wait badge, destination node). Tapping any card (Direct, Nearby, Two-train) or reach option updates the timeline.
3. **Direct trains** (always shown, even if full). Each row: train number and name, departs and arrives with day, seat badge. If none has a seat, show the message "No confirmed seat on direct trains" and grey the rows. Tapping a direct train selects it in the Route Panel.
4. **Tabs**: "Nearby station" and "Two trains", with counts. Only options with every leg confirmed.
5. **Sort chips**: Earliest arrival (default), Shortest total time, Least road travel.
6. Up to 10 cards per tab, with "Show more" not needed in the prototype.

## 4. Result card

### Nearby Station Cards (Phase 2b extension)
Contains an interactive **"Reach [station name]"** section listing options to get from the origin to the nearby station:
- Train options: up to 3 confirmed train legs arriving at least the user's safe gap before the onward train departure.
- Road option: estimated travel (~Xh Ym by road).
- Each reach option includes a train/road icon, departure and arrival times with weekday, a seat badge with "Simulated", and a wait badge.
- Tapping a reach option dynamically updates the selected route in the Route Panel.

Illustrative layout (the numbers are examples, not search output):

```
Arrive Fri 13 Nov 04:50   14h 50m total   road + 1 train
-----------------------------------------------
[road icon] Sasaram to Mughal Sarai Jn   ~3h 16m by road (estimated)
   dashed line
12801 Purushottam SF Express   [AVL 12]
   Thu 17:30  Mughal Sarai Jn  ->  Fri 04:50  New Delhi
   (second train, if any, after a wait badge: [Safe 3h 10m])
-----------------------------------------------
Tip: Book the leg that sells out first, first.
Raah only plans. Book on IRCTC.      [Book on IRCTC]
Simulated seats. Days unverified (if days_of_run is null).
```

Rules: times show the weekday and 24-hour clock. Total time is first departure to final arrival (road time included for nearby options). Wait badge thresholds: green at 3 h or more, amber from 2 h to under 3 h, red under the user's safe gap.

## 5. States

| State | Content |
|---|---|
| Loading data | Skeleton cards + route glyph animation. |
| Searching | Skeleton for under 1 s; button disabled. |
| Data failed | "Could not load the timetable. Retry." (button). |
| No results | "No confirmed route found. Try a different date, a longer wait, or another class." |
| Same From/To | Inline error under To. |

## 6. Microcopy (keep short, plain English with light Hinglish)

- Button: Find my Raah
- Empty home: Seat nahi? Raah hai na.
- Direct full: No confirmed seat on direct trains
- Road leg: ~3h 16m by road (estimated)
- Honesty: Sample 2016 timetable. Seats are simulated.
- Booking: Raah only plans. Book on IRCTC.

Do not show prices, ratings, "live" labels, or any number that is not in the data or the simulation.

## 7. Responsive

- 360 to 599 px: single column, sticky "Edit search" bar on results.
- 600 px and up: form and results in one centered column, max 720 px.
