import json, tempfile, os
TEMP = tempfile.gettempdir()
with open(os.path.join(TEMP, 'trains_check.json'), encoding='utf-8') as f:
    d = json.load(f)
print(type(d))
if isinstance(d, list):
    r = d[:2]
elif isinstance(d, dict):
    r = list(d.get('features', d.get('results', [])))[:2]
else:
    r = []
print(r[0].keys() if r else 'empty')
print(r[0])

