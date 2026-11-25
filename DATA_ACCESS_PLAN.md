# Real Data Access Plan (after the prototype)

The product only becomes real when it has **live seat availability**. Booking is out of scope, but availability data is still restricted, so this is the main dependency.

## 1. Order of attack

1. **Ask the ideathon organizers** (IRCTC, SBI, Think Startup) for:
   - a current timetable sample for the Bihar to Delhi corridor (CRIS/Railway Board),
   - an introduction to whoever handles approved-partner data access (the pitch mentions the TIES scheme; confirm that it exists and applies, I have not verified it),
   - a read-only availability pilot for one corridor.
2. **Licensed third-party provider** for a small pilot, only if its terms allow the use (see section 3).
3. **Never scrape** IRCTC or NTES (terms, blocking, legal risk).

## 2. One-page note to send

- Who: Raah.ai, student team. What: journey planner that finds confirmed-seat routes through nearby stations and two-train combinations. Raah does not sell tickets or handle payments.
- Pilot: one corridor, read-only availability, no ticketing, caching, strict rate limits.
- Ask: timetable data, availability access for the pilot, and a contact.
- Benefit to the railway (state only with numbers): seats that go unused on partial segments. Prepare an estimate for the corridor before claiming it.

## 3. Third-party API checked (not tested)

IndianRailAPI.com (site read on 2026-11-09, no calls made):
- Has Seat Availability, Trains Between Stations, Train Schedule, Live Station and Average Delay endpoints.
- Seat Availability is listed for **Enterprise and Advanced plans only**, **General quota only**, one train and route per call, returns 7 dates. The sample response is dated 2018 and the page says "Coming Soon" for the demo.
- The FAQ says: unofficial hosting ("Godaddy server and other third party"), 90 to 99% uptime, fixes within 24 to 48 hours, no more than one request per second per IP, accounts blocked for "invalid uses". Test accounts are free but limited to fixed inputs. Plans were not visible (login required).
- No sign of IRCTC authorization. Ask them: data source, authorization, plan prices, whether the seat endpoint works today.
Use it, if at all, as a stopgap for a pilot, not as the pitch's data source.

## 4. Query volume (why pruning matters)

For SSM to NDLS on 2026-11-12 from 08:00, the search finds 237 nearby-station runs and 317 two-train combinations. Checking all of them needs up to about 870 availability calls (fewer where legs repeat). At one call per second that is over 14 minutes. So:

1. Filter by timetable first (done in search).
2. Sort candidates by arrival time and check availability lazily until 10 confirmed options are found.
3. Cache by `(train, origin date, class, segment)` with a short expiry.
4. Offer 3-train mode only on request.

## 5. Other data to upgrade

- Current timetable (Railway Board "Trains at a Glance" is a lead; format and licence not verified).
- Verified days of run for every train.
- Real road times for nearby-station legs (routing service, precomputed for station pairs).
- Delay history to set the safe gap from real data instead of a fixed 2 to 3 hours.
