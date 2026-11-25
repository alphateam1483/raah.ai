"""
Check if the extra SSM-NDLS trains actually halt at SSM (arr != dep).
In raw DataMeet schedules, check each train's SSM schedule row.
"""
import json, tempfile, os
from collections import defaultdict

TEMP = tempfile.gettempdir()

with open(os.path.join(TEMP, 'schedules.json'), encoding='utf-8') as f:
    sched_list = json.load(f)

# Group by train_number
schedules_by_train = defaultdict(list)
for row in sched_list:
    schedules_by_train[str(row.get('train_number',''))].append(row)

# The 18 trains I found
trains_to_check = ['12453','12439','12877','22823','12381','12397','12301',
                   '12323','12281','12313','12273','12259','12819','12875',
                   '12815','22811','12825','12801']

for num in trains_to_check:
    rows = schedules_by_train.get(num, [])
    ssm_row = next((r for r in rows if (r.get('station_code','') or '').upper() == 'SSM'), None)
    if ssm_row:
        arr = ssm_row.get('arrival','')
        dep = ssm_row.get('departure','')
        is_halt = arr != dep and arr != 'None' and dep != 'None' and arr and dep
        print(f"{num}: SSM arr={arr!r} dep={dep!r} → real_halt={is_halt}")
    else:
        print(f"{num}: SSM row NOT FOUND in schedules")

