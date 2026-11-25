import json, tempfile, os
TEMP = tempfile.gettempdir()
with open(os.path.join(TEMP, 'schedules.json'), encoding='utf-8') as f:
    d = json.load(f)
print(type(d))
if isinstance(d, list):
    r = d[:2]
else:
    r = list(d.get('features', []))[:2]
print(r[0].keys() if r else 'empty')
print(r[0])

