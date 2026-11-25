# Raah.ai — Master Architecture, Data & Development Guide

> **Tagline:** *Seat nahi? Raah hai na.*  
> **Project:** Raah.ai Prototype (Grand Chord Corridor)  
> **Target Audience:** Passengers in tier-2/3 towns facing waitlists; engineers, judges, and educators learning how this system works.

---

## 1. Executive Summary & The Problem

### The Indian Railways Waitlist Dilemma
On high-demand Indian Railways corridors (e.g., Eastern UP / Bihar to New Delhi), direct train tickets sell out weeks or months in advance. A passenger from a town like **Sasaram (SSM)** trying to reach **New Delhi (NDLS)** typically sees only long Waiting Lists (`WL 80+`).

### The Manual "Hacks" Passengers Use Today
Desperate travelers manually spend hours switching between multiple apps:
1. They search trains from nearby junction stations (e.g., Mughalsarai / DDU, Varanasi, Gaya).
2. They manually piece together 2-train journeys (e.g., Sasaram to Mughalsarai on one train, then Mughalsarai to New Delhi on another).
3. They try to calculate safe transfer buffer times so they don't miss their connecting train.

### The Raah.ai Solution
**Raah.ai** automates this entire search process in a fraction of a second. When direct trains are full, Raah searches:
1. **Direct Trains:** Shows all direct trains and their seat statuses.
2. **Two-Train Split Journeys:** Discovers 2-train journeys through intermediate junctions with guaranteed safe layover windows (1h–3h).
3. **Nearby Station Feeder Options:** Connects the traveler from their local origin to a nearby major station via confirmed connecting trains (or road transfer for short distances ≤10 km).

**Crucial Philosophy:** Raah only plans and discovers verified routes. The passenger books the individual legs on IRCTC. Raah never touches payments or credentials.

---

## 2. Tech Stack & Architecture

Raah.ai is built as an ultra-fast, zero-backend, client-side progressive web application.

```
raah-app/
├── index.html                   # HTML entry point (inline #4a166d to prevent dark flash)
├── public/
│   ├── assets/
│   │   ├── logo.png             # Official brand vector logo
│   │   └── raah_logo_animation.mp4 # Startup video motion reveal
│   └── data/
│       └── corridor.json        # Compiled 2016 Grand Chord timetable (379 KB)
├── src/
│   ├── main.jsx                 # React root mounting
│   ├── App.jsx                  # Main application state & screen routing
│   ├── index.css                # Global styles & responsive mobile design
│   ├── styles/
│   │   └── tokens.css           # Design tokens (colors, radii, typography, spacing)
│   ├── lib/
│   │   ├── time.js              # Strict UTC time calculation engine
│   │   ├── search.js            # Core graph & corridor search algorithm
│   │   ├── access.js            # Feeder / connecting train search for nearby hubs
│   │   └── mockSeats.js         # Deterministic simulated availability engine
│   ├── components/
│   │   ├── SplashScreen.jsx     # Startup video reveal overlay
│   │   ├── Header.jsx           # Brand header with tagline & prototype banner
│   │   ├── Banner.jsx           # Transparency notification (Simulated / Sample Data)
│   │   ├── SearchForm.jsx       # Origin/Destination, Date, Time & Advanced filters
│   │   ├── StationPicker.jsx    # Searchable station autocomplete dropdown
│   │   ├── ResultsScreen.jsx    # Tabs (Nearby, Two-trains, Direct) & Sorting
│   │   ├── ResultCard.jsx       # Journey cards with train legs, times, and badges
│   │   ├── RoutePanel.jsx       # Animated vertical journey timeline
│   │   ├── SeatBadge.jsx        # AVL / RAC / WL status indicators
│   │   ├── WaitBadge.jsx        # Safe vs tight layover time badges
│   │   ├── BottomNavBar.jsx     # Sticky mobile navigation (Search, Results, Journey, Info)
│   │   └── LoadingSkeleton.jsx  # Shimmer loading feedback
│   └── tests/
│       ├── parity.test.js       # Ground-truth algorithmic verification
│       ├── unit.test.js         # Discrete rule & edge-case unit tests
│       └── access.test.js       # Connecting train access tests
```

### Core Technologies:
- **Framework:** React 19 + Vite 8
- **Language:** JavaScript (ESNext, clean modular functions)
- **Styling:** Vanilla CSS with Custom Properties (`tokens.css`), Glassmorphism, CSS Grid & Flexbox (no heavy UI frameworks).
- **Test Runner:** Vitest (runs in < 1 second).
- **Network Footprint:** **Zero external API calls.** The entire corridor timetable (`corridor.json`, 379 KB) loads once on app launch. All graph traversal and seat simulation happen in memory in milliseconds.

---

## 3. The Dataset: Grand Chord Corridor

### Data Provenance & Source
- **Raw Source:** [DataMeet Indian Railways Open Data](https://github.com/datameet/railways) (Stations, Trains, Schedules).
- **License:** Creative Commons Zero (CC0 Public Domain).
- **Snapshot Date:** August 8, 2016.
- **Corridor Scope:** **Grand Chord Corridor** (Bihar & Eastern UP to New Delhi, connecting Sasaram, Gaya, Mughalsarai, Varanasi, Allahabad, Kanpur, and New Delhi).

### Corridor Compilation (`build_corridor.py`)
From 8,990 nationwide stations and 5,208 trains, a dedicated compiler script extracted:
- **54 Stations:** Key junction hubs and feeder stations along the corridor.
- **693 Trains:** Trains that halt at one or more corridor stations.
- **Total File Size:** ~379 KB (fast to load even on 2G/3G mobile networks).

### Station Naming Note (Historical 2016 vs. Modern)
Because the dataset is from 2016:
- Mughalsarai Junction is listed as **MGS** (now known as Pt. Deen Dayal Upadhyaya Jn / DDU).
- Allahabad Junction is listed as **ALD** (now known as Prayagraj Jn / PRYJ).
- *Strict Rule:* The prototype uses only true dataset codes (`MGS`, `ALD`) without fabricating synthetic codes.

---

## 4. Timetable Representation & The UTC Time Engine (`time.js`)

Railway timetables are tricky because trains travel over multiple days across midnight boundaries.

### The Problem with Local Date Objects:
Using standard JavaScript `new Date()` causes timezone issues and daylight-saving bugs. India operates on Indian Standard Time (IST, UTC+5:30) with no daylight saving.

### The Raah.ai Solution:
1. **Minutes-from-Origin Representation:**
   In `corridor.json`, a train stop's arrival and departure are recorded as **minutes elapsed since 00:00 on the calendar day the train departed its origin station**.
   - Example: Purushottam Express (12801) departs Puri on Day 0. It reaches Sasaram on Day 1 at 15:27 (`dep = 2367 minutes`).
2. **Pure UTC Arithmetic:**
   All date manipulations are calculated in UTC (`Date.UTC`), preserving exact minute offsets without local machine timezone drift.

---

## 5. The Routing & Search Algorithms (`search.js` & `access.js`)

When a user searches from Origin $O$ to Destination $D$:

```
               [Origin O]
              /          \
     (Nearby Train)       (Train 1)
            v                v
      [Nearby Hub N]    [Junction X]
            |                |
        (Train)           (Train 2)
            \                /
             v              v
           [Destination D]
```

### 1. Direct Trains (`legs(O, D)`)
- Scans all trains halting at $O$ and later at $D$.
- Filters departures between the user's earliest boarding time and midnight of the travel date.
- Always shows direct trains even if full, establishing the baseline.

### 2. Two-Train Journeys (`legs(O, X) + legs(X, D)`)
- For every intermediate junction $X$ along the corridor:
  - Finds Train 1 from $O \rightarrow X$ departing on the journey date.
  - Finds Train 2 from $X \rightarrow D$ departing after Train 1 arrives.
  - **Safe Gap Rule:** Departure of Train 2 must be at least `minGap` (default 120 min) and at most `maxWait` (default 600 min) after Train 1 arrives.
  - **Exclusion Rule 1:** Train 1 cannot equal Train 2.
  - **Exclusion Rule 2:** If Train 2 also halts at $O$ earlier in its run, discard it (the passenger could simply board Train 2 directly at $O$).
  - **Deduplication:** Deduped by `(train1, train2, junction)`, keeping the earliest arriving combination.

### 3. Nearby Feeder Stations & Train-Only Access (`access.js`)
- For nearby stations within 200 km:
  - If distance $> 10\text{ km}$: **Train-Only Rule** applies. Raah searches for confirmed connecting train legs departing $O$ and arriving at the nearby station $N$ with a safe transfer gap before the onward train departs.
  - If distance $\le 10\text{ km}$: Short local road transfer is permitted (`km * 1.35` at $40\text{ km/h}$).

---

## 6. Simulated Seat Availability Engine (`mockSeats.js`)

In the prototype, real IRCTC live seat availability APIs are not connected. Instead, a **deterministic, seed-based simulation engine** mirrors realistic Indian Railways reservation patterns:

1. **Deterministic Hashing:**
   - Seeded by hashing `(trainNumber, originStartDate, classCode)` using the `mulberry32` pseudo-random generator.
   - The same search always yields the exact same seat counts on every device and reload.
2. **Hop-by-Hop Status Generation:**
   - For every consecutive station pair, probabilities are assigned:
     - **AVAILABLE (`AVL n`):** 60% probability ($n \in [1, 40]$).
     - **RAC (`RAC n`):** 10% probability ($n \in [1, 12]$).
     - **WAITLIST (`WL n`):** 30% probability ($n \in [1, 60]$).
3. **Worst-Interval Rule:**
   - A passenger's multi-station leg takes the **worst status** of all intermediate hops. If any hop is `WL`, the leg is `WL`. If one hop is `RAC` and the rest `AVL`, the leg is `RAC`.
   - *Real-world effect:* Long cross-country journeys are almost always `WL`, while shorter intermediate segments frequently have confirmed `AVL` seats.
4. **Demo Override:**
   - The 4 direct trains from Sasaram to New Delhi (12877, 12397, 12815, 12801) are hardwired to return `WL` in demo mode, perfectly setting up the core value proposition: *"Direct is full? Raah finds your confirmed route."*
5. **Transparency & Honesty:**
   - Every seat badge explicitly displays `"Simulated"`.
   - A permanent prototype banner reminds users that the timetable is a 2016 sample and availability is simulated.

---

## 7. Design System & Visual Identity

### Brand Palette (Purple, White & Black)
Inspired by the high-speed transit route logo:
- `--canvas: #09030e` (OLED deep black-purple)
- `--surface: #180826` (Rich card purple)
- `--surface-2: #260d3d` (Interactive elements & dropdowns)
- `--logo-purple: #460b6a` (Brand logo purple)
- `--splash-bg: #4a166d` (Exact background of the intro video)
- `--violet: #9333ea` (Route lines & action accents)
- `--lilac: #c084fc` (Text accents, badges & station nodes)
- `--white: #ffffff` (Primary text & contrast elements)

### Mobile-First Layout
- Optimized for standard Indian budget mobile screens (**360 px width**).
- Glassmorphic sticky bottom navigation bar (`BottomNavBar.jsx`).
- Sticky collapsible **Route Panel** (`RoutePanel.jsx`) displaying an animated vertical transit line with junction wait badges.
- Smooth startup video animation reveal (`raah_logo_animation.mp4`) transitioning into the search interface with zero layout shift or black flash.

---

## 8. Verification & Test Suite

The project maintains an automated test suite with **18 passing tests** covering:
1. **Parity Tests (`parity.test.js`):** Verifies search counts against the original Python reference implementation (`reference/search.py`) for Sasaram $\rightarrow$ New Delhi, New Delhi $\rightarrow$ Sasaram, etc.
2. **Unit Tests (`unit.test.js`):** Tests UTC day offsets, weekday bitmask parsing, gap filters, class filters, and worst-interval seat mock logic.
3. **Access Tests (`access.test.js`):** Tests connecting train leg ordering, minimum layover gap enforcement, and same-train exclusion.

Run the test suite anytime:
```bash
cd raah-app
npm test
```

---

## 9. Future Roadmap (From Prototype to Production)

1. **Live Indian Railways API Integration:** Transition `mockSeats.js` to real IRCTC/CRIS availability APIs with query caching and lazy evaluation.
2. **All-India Timetable:** Expand beyond the Grand Chord corridor to nationwide coverage using current "Trains at a Glance" schedules.
3. **Smart Live PNR & Delay Tracking:** Incorporate real-time train delay predictions so transfer buffers dynamically adjust during active journeys.
4. **Hinglish Conversational Voice Assistant:** Voice-driven search tailored for non-English speakers in regional towns.
