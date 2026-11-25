# Raah.ai: Product Requirements (Prototype)

Tagline: **Seat nahi? Raah hai na.**
Track: Open Innovation (IRCTC youth ideathon, with SBI and Think Startup).

## 1. Problem

Confirmed seats on popular routes sell out early. A passenger sees only waiting list on the direct train, then manually checks other stations, other trains and other dates across several apps. This takes hours; many people in smaller towns give up or pay more for other transport.

## 2. Product in one paragraph

The user enters From, To, date, earliest boarding time and class. If no direct train has a confirmed seat, Raah searches outward in steps: (1) direct trains, (2) direct trains from nearby stations within 200 km, (3) two-train journeys through a junction with a safe waiting gap. It shows only journeys where every leg has a confirmed seat. Raah only plans. The passenger books on IRCTC or another platform.

## 3. Users

- Primary: passengers from tier-2 and tier-3 towns (example: Sasaram, Bihar) who travel to big cities and often face waiting lists.
- Secondary: anyone planning a trip on a sold-out route.

## 4. Prototype goals

1. Show the full flow on any pair of the 54 corridor stations, in both directions, in under 30 seconds of demo time.
2. Prove the search logic works on a real (old) timetable.
3. Be honest: timetable is a 2016 sample, seats are simulated, and the UI says so.

## 5. Non-goals (prototype)

Ticket booking, payments, login, live seat data, live train running status, fares, maps, push alerts, voice/AI assistant, all-India coverage, 3-train journeys.

## 6. User stories

- As a passenger, I enter Sasaram to New Delhi and see that direct trains are on waiting list, and then see confirmed alternatives.
- I can set my earliest boarding time so I do not see journeys I cannot catch.
- I can choose a longer or shorter safe gap between trains.
- I can see which part of the journey is by road (estimated) and how long it takes.
- I can see how long I wait between trains and whether it is safe.
- I can tap "Book on IRCTC" for the legs I want.

## 7. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | Search form: From, To (searchable, 54 stations), date, earliest time, class (SL, 3A, 2A, 1A), swap button. |
| FR-2 | Advanced: safe gap (1h / 2h default / 3h / custom), max wait (default 10h), include RAC toggle, "3 trains" shown disabled as coming soon. |
| FR-3 | Search runs fully in the browser on `data/corridor.json`, using the logic in `docs/TRD.md`. |
| FR-4 | Direct trains always shown with their seat status, even when full. |
| FR-5 | Nearby-station and two-train options shown only if every leg is confirmed (AVL; RAC only if toggled). |
| FR-6 | Cards show legs, train number and name, times with day, seat badges, wait badge, estimated road leg, total time. |
| FR-6b | Nearby options include access choices ("Reach [station name]") offering confirmed train legs arriving with safe gap alongside estimated road travel. |
| FR-6c | Interactive Route Panel at top of results visualizing the selected journey as an animated vertical timeline across nodes with wait badges. |
| FR-7 | Sort: earliest arrival (default), shortest total time, least road travel. Cap 10 per tab. |
| FR-8 | Every seat badge is labeled Simulated; the prototype banner is always visible. |
| FR-9 | Empty, loading and error states as in `docs/UX_SPEC.md`. |
| FR-10 | "Book on IRCTC" opens https://www.irctc.co.in in a new tab. Raah never handles payment. |

## 8. Non-functional requirements

- Works on 360 px phones and desktop. First search result under 1 second on a mid-range phone (see TRD for the performance plan).
- No network calls except loading the app and `corridor.json`.
- Accessibility per `docs/DESIGN_SYSTEM.md`.

## 9. Success criteria (prototype)

- All parity tests in `docs/TEST_PLAN.md` pass.
- Default demo (Sasaram to New Delhi) shows 4 direct trains on waiting list (08:00 start: 2) and at least 3 confirmed alternatives.
- A viewer can tell, from the screen alone, that data is sample and seats are simulated.

## 10. Roadmap

| Stage | What |
|---|---|
| Prototype (now) | Sample timetable, simulated seats, 54 stations. |
| Pilot | Real availability for one corridor (see `docs/DATA_ACCESS_PLAN.md`), current timetable, verified days of run, real road times. |
| Later | More corridors, 3-train mode, alerts when seats open on all legs, Hinglish voice assistant. |

## 11. Risks and open questions

1. **Live seat data** is the biggest dependency and is not yet secured. Plan in `docs/DATA_ACCESS_PLAN.md`.
2. **Separate bookings.** Each leg is a separate ticket. A seat confirmed at search time can be gone by booking time, and a late first train can miss the second. Mitigation: safe gap, "book the leg that sells out first" tip.
3. **Search cost.** Real availability checks per search can reach hundreds. Needs pruning and caching.
4. **Old timetable.** The data is from 2016; timings and trains have changed.
5. **Competition.** Apps such as ixigo, ConfirmTkt and RailYatri already offer alternative-route or seat suggestions. I have not compared features. Before claiming a difference in the pitch, check what they actually do.
6. **Railway benefit claim** ("better seat utilisation") needs numbers on unused seats per segment before it is stated as fact.
