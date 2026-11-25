# Data Specification: `data/corridor.json`

## 1. Provenance

- Source: **datameet/railways** (stations, trains, schedules). License: **CC0**. The files are dated **2016-08-08**. Timings and trains have changed since then.
- Source size: 5,208 trains, 8,990 stations (with coordinates), 417,080 schedule rows.
- Built by `reference/build_corridor.py`. Output: 54 stations, 716 trains, 379 KB.

## 2. Schema

```jsonc
{
  "meta": { "source": "...", "halt_rule": "...", "times": "...", "days_of_run": "...", "road_time": "...", "availability": "...", "trains": 716, "stations": 54 },
  "stations": { "SSM": { "name": "SASARAM", "lat": 24.95593, "lon": 84.01942 } },
  "nearby":   { "SSM": [ { "code": "DOS", "km": 17 } ] },
  "trains": [{
    "number": "12801", "name": "Purushottam SF Express", "type": "SF",
    "from": "PURI", "to": "NDLS",
    "classes": { "sleeper": true, "third_ac": true, "second_ac": true, "first_ac": false, "chair_car": false, "first_class": false },
    "stops": [ { "code": "SSM", "arr": 2366, "dep": 2367 } ],
    "days_of_run": "1111111",
    "days_of_run_source": "UNVERIFIED hand-made list (not from DataMeet)"
  }]
}
```

- `stops[].arr` / `dep`: minutes since **00:00 on the calendar day the train leaves its origin** (1440 = 00:00 the next day). Example: 12801 at Sasaram has dep 2367 = 1 day + 15:27, so it leaves Sasaram at 15:27 on the day after it left Puri.
- Only **real halts at corridor stations** are kept.
- `nearby[x]`: other corridor stations within 200 km straight-line, sorted by distance. Road time is **not** in the file (estimate: km x 1.35 / 40 km/h).

## 3. Known data facts (checked)

1. `schedules.json` lists **every station a train passes**, including pass-throughs. A real halt is where arrival differs from departure (or it is the origin/terminus). Example: Howrah-New Delhi Rajdhani 12301 has 124 rows between Sasaram and New Delhi but only 3 real halts (Mughalsarai, Allahabad, Kanpur).
2. There is no `station_order` field; rows are ordered by `id`.
3. Times missing at origin/terminus are the text `"None"`, not null.
4. `day` is empty in 22,561 rows, so day offsets are rebuilt by walking the times and counting midnight wraps.
5. Validation: rebuilt journey duration vs the dataset's stated duration: **4,846 trains match (within 10 min), 251 do not (excluded), 111 cannot be checked (no stated duration)**.
6. Dataset has no days-of-run. 17 trains carry an **unverified** days-of-run list that came from an AI-generated file, not from DataMeet. All other trains: `days_of_run = null`.
7. Technical stops (cabins, halts, block huts, yards) are removed from the hub list.
8. Station names are pre-2018. Mughalsarai appears as `MGS` (the station is now called Pt. Deen Dayal Upadhyaya Jn, code DDU, from public knowledge; not in this dataset). Prayagraj appears as `ALD` (Allahabad Jn). `DDU` and `PRYJ` do not exist in this data.
9. Only **4 trains** in this data halt at both Sasaram (SSM) and New Delhi (NDLS): 12877, 12397, 12815, 12801.

## 4. Coverage (54 stations)

ALD, ALJN, ARA, AUBR, BARH, BBU, BDL, BE, BEA, BKP, BSB, BTA, BUI, BXR, CBH, CNB, CPBH, CPR, DEOS, DLN, DNR, DOS, DSS, DTO, DURE, ETW, FUT, GAYA, GHD, GZB, HJP, HRE, KOO, KQR, LKO, MB, MFP, MGS, MKA, MZP, NDLS, PNBE, PNC, PSB, PWS, RFJ, RJPB, SEE, SMND, SSM, SV, TDL, YDD, ZNA.

Selection rule: stations within 200 km of Sasaram that are real halts on at least 4 Delhi-bound trains, plus stations after that point toward New Delhi that are real halts on at least 5 such trains. This is a Bihar-to-Delhi corridor; it is not all of India.

## 5. Not in the data

Live or simulated seat availability, fares, delays, road times, platform numbers, current timetable, verified days of run.

## 6. Refreshing the data

`python3 -I reference/build_corridor.py <datameet_dir> <days_json> <out_dir>`. To use a newer timetable (for example the Railway Board's "Trains at a Glance"), write a new loader that produces the same schema. Do not scrape IRCTC or NTES.
