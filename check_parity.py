"""
Quick parity check: how many trains in corridor.json stop at both SSM and NDLS?
Expected: exactly 4 (12877, 12397, 12815, 12801) per DATA_SPEC.md §3 fact 9.
"""
import json

with open('raah-app/public/data/corridor.json', encoding='utf-8') as f:
    data = json.load(f)

ssm_ndls = []
for t in data['trains']:
    codes = [s['code'] for s in t['stops']]
    if 'SSM' in codes and 'NDLS' in codes:
        si = codes.index('SSM')
        ni = codes.index('NDLS')
        if si < ni:
            ssm_stop = t['stops'][si]
            ndls_stop = t['stops'][ni]
            # dep at SSM in minutes
            dep_ssm = ssm_stop['dep']
            dep_h = (dep_ssm % 1440) // 60
            dep_m = (dep_ssm % 1440) % 60
            print(f"  {t['number']} {t['name']}: SSM dep offset={dep_ssm} "
                  f"({dep_ssm//1440}d {dep_h:02d}:{dep_m:02d}), days={t['days_of_run']}, "
                  f"classes={t['classes']}")
            ssm_ndls.append(t)

print(f"\nTotal SSM→NDLS trains: {len(ssm_ndls)} (expected: 4)")
print(f"Train numbers: {[t['number'] for t in ssm_ndls]}")

