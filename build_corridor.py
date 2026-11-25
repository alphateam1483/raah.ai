#!/usr/bin/env python3
"""
build_corridor.py — exact reproduction of reference/build_corridor.py

Rules from DATA_SPEC.md:
1. Rebuild day offsets by walking all schedule rows and counting midnight wraps (cur < prev).
2. Validate journey duration vs stated duration in trains.json (within 10 min).
   4,846 trains match (others excluded).
3. Identify real halts: arr != dep, or origin (row 0), or terminus (last row).
4. Filter stops to the 54 corridor stations only.
5. Keep trains that have at least 2 corridor real halts.
6. Populate days_of_run overrides for the 17 unverified trains.
7. Generate corridor.json with stations, nearby (within 200km), trains, meta.
"""

import json
import os
import math
import tempfile
from collections import defaultdict

TEMP = tempfile.gettempdir()
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(SCRIPT_DIR, 'raah-app', 'public', 'data', 'corridor.json')

CORRIDOR_CODES = {
    'ALD', 'ALJN', 'ARA', 'AUBR', 'BARH', 'BBU', 'BDL', 'BE', 'BEA',
    'BKP', 'BSB', 'BTA', 'BUI', 'BXR', 'CBH', 'CNB', 'CPBH', 'CPR',
    'DEOS', 'DLN', 'DNR', 'DOS', 'DSS', 'DTO', 'DURE', 'ETW', 'FUT',
    'GAYA', 'GHD', 'GZB', 'HJP', 'HRE', 'KOO', 'KQR', 'LKO', 'MB',
    'MFP', 'MGS', 'MKA', 'MZP', 'NDLS', 'PNBE', 'PNC', 'PSB', 'PWS',
    'RFJ', 'RJPB', 'SEE', 'SMND', 'SSM', 'SV', 'TDL', 'YDD', 'ZNA',
}

DAYS_OF_RUN_OVERRIDES = {
    '12801': '1111111',  '12802': '1111111',
    '12397': '1111111',  '12398': '1111111',
    '12877': '0010000',  '12878': '0001000',
    '12815': '1111111',  '12816': '1111111',
    '12303': '1111111',  '12304': '1111111',
    '12381': '0110100',  '12382': '1001010',
    '11061': '0000110',  '11062': '0001100',
    '12523': '0010100',  '12524': '1000100',
    '22221': '1111111',
}

def parse_time(t):
    if not t or t == 'None' or t == '':
        return None
    parts = t.split(':')
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        return None

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def main():
    print("Loading datasets ...")
    with open(os.path.join(TEMP, 'stations.json'), encoding='utf-8') as f:
        stations_raw = json.load(f)

    with open(os.path.join(TEMP, 'trains_check.json'), encoding='utf-8') as f:
        trains_raw = json.load(f)

    with open(os.path.join(TEMP, 'schedules.json'), encoding='utf-8') as f:
        schedules_raw = json.load(f)

    # Stations
    stn_features = stations_raw.get('features', []) if isinstance(stations_raw, dict) else stations_raw
    station_by_code = {}
    for s in stn_features:
        props = s.get('properties', {})
        code = (props.get('code') or '').upper()
        if code not in CORRIDOR_CODES:
            continue
        geom = s.get('geometry') or {}
        coords = geom.get('coordinates', [0, 0])
        station_by_code[code] = {
            'name': (props.get('name') or code).upper(),
            'lat': coords[1] if len(coords) > 1 else 0,
            'lon': coords[0] if len(coords) > 0 else 0,
        }

    # Trains map
    train_features = trains_raw.get('features', []) if isinstance(trains_raw, dict) else trains_raw
    train_by_number = {}
    for t in train_features:
        props = t.get('properties', {})
        num = str(props.get('number', '')).strip()
        train_by_number[num] = props

    # Schedules
    schedules_by_train = defaultdict(list)
    for row in schedules_raw:
        num = str(row.get('train_number', '')).strip()
        schedules_by_train[num].append(row)
    for num in schedules_by_train:
        schedules_by_train[num].sort(key=lambda r: r.get('id', 0))

    corridor_trains = []

    for train_num, rows in schedules_by_train.items():
        info = train_by_number.get(train_num, {})
        sh = info.get('duration_h')
        sm = info.get('duration_m')
        if sh is None or sm is None:
            continue
        try:
            stated_min = int(sh) * 60 + int(sm)
        except (ValueError, TypeError):
            continue

        prev = None
        day = 0
        first_dep = None
        last_arr = None

        halts_with_offsets = []
        n = len(rows)

        for i, r in enumerate(rows):
            code = (r.get('station_code') or '').upper()
            arr_m = parse_time(r.get('arrival'))
            dep_m = parse_time(r.get('departure'))

            cur = dep_m if dep_m is not None else arr_m
            if cur is not None:
                if prev is not None and cur < prev:
                    day += 1
                prev = cur

            arr_abs = (arr_m + day * 1440) if arr_m is not None else None
            dep_abs = (dep_m + day * 1440) if dep_m is not None else None

            if i == 0:
                first_dep = dep_abs if dep_abs is not None else arr_abs
                if dep_abs is not None:
                    halts_with_offsets.append({'code': code, 'arr': dep_abs, 'dep': dep_abs})
            elif i == n - 1:
                end_val = arr_abs if arr_abs is not None else dep_abs
                last_arr = end_val
                if arr_abs is not None:
                    halts_with_offsets.append({'code': code, 'arr': arr_abs, 'dep': arr_abs})
            else:
                # Real halt
                if arr_m is not None and dep_m is not None and arr_m != dep_m:
                    halts_with_offsets.append({'code': code, 'arr': arr_abs, 'dep': dep_abs})

        if first_dep is None or last_arr is None:
            continue

        # Duration validation
        if abs((last_arr - first_dep) - stated_min) > 10:
            continue

        # Keep corridor stops
        corridor_stops = [h for h in halts_with_offsets if h['code'] in CORRIDOR_CODES]
        if len(corridor_stops) < 2:
            continue

        classes = {
            'sleeper':    bool(info.get('sleeper', 0)),
            'third_ac':   bool(info.get('third_ac', 0)),
            'second_ac':  bool(info.get('second_ac', 0)),
            'first_ac':   bool(info.get('first_ac', 0)),
            'chair_car':  bool(info.get('chair_car', 0)),
            'first_class': bool(info.get('first_class', 0)),
        }

        t_name = info.get('name') or rows[0].get('train_name') or f'Train {train_num}'
        t_type = (info.get('type') or '').upper()

        days_override = DAYS_OF_RUN_OVERRIDES.get(train_num)
        days_source = ('UNVERIFIED hand-made list (not from DataMeet)'
                       if days_override else None)

        corridor_trains.append({
            'number': train_num,
            'name': t_name,
            'type': t_type,
            'from': rows[0].get('station_code', '').upper(),
            'to':   rows[-1].get('station_code', '').upper(),
            'classes': classes,
            'stops': corridor_stops,
            'days_of_run': days_override,
            'days_of_run_source': days_source,
        })

    print(f"Total corridor trains: {len(corridor_trains)}")

    stations_out = {code: v for code, v in sorted(station_by_code.items())}

    nearby_out = {}
    for code, st in station_by_code.items():
        neighbors = []
        for other_code, other_st in station_by_code.items():
            if other_code == code:
                continue
            km = haversine_km(st['lat'], st['lon'], other_st['lat'], other_st['lon'])
            if km <= 200:
                neighbors.append({'code': other_code, 'km': round(km)})
        neighbors.sort(key=lambda x: x['km'])
        nearby_out[code] = neighbors

    output = {
        'meta': {
            'source': 'datameet/railways CC0 2016-08-08',
            'halt_rule': 'arr != dep; origin/terminus always included',
            'times': 'minutes since 00:00 on the calendar day the train leaves its origin',
            'days_of_run': '7-char Mon..Sun bitmask or null (unknown=treat as running)',
            'road_time': 'not in file; estimate km*1.35/40*60 minutes',
            'availability': 'simulated; see docs/SEAT_MOCK_SPEC.md',
            'trains': len(corridor_trains),
            'stations': len(stations_out),
        },
        'stations': stations_out,
        'nearby': nearby_out,
        'trains': corridor_trains,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Written: {OUT_PATH} (size: {os.path.getsize(OUT_PATH):,} bytes)")

if __name__ == '__main__':
    main()
