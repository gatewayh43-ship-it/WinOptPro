import urllib.request
import json
from collections import defaultdict

url = 'https://raw.githubusercontent.com/ChrisTitusTech/winutil/main/config/applications.json'
try:
    data = json.loads(urllib.request.urlopen(url).read())
    cats = defaultdict(list)
    for key, val in data.items():
        if isinstance(val, dict):
            # Winget ID is usually in "Id" or "winget" depending on the JSON
            # In WinUtil it's sometimes nested under "WingetId" or similar, or it's just the key if it matches Winget format
            # Let's just print the raw object structure for the first one to know
            pass
    
    first_key = list(data.keys())[0]
    print("Structure of first item:")
    print(json.dumps({first_key: data[first_key]}, indent=2))
    
    # Let's check what keys the objects actually have
    fields = set()
    for v in data.values():
        if isinstance(v, dict):
            fields.update(v.keys())
    print(f"Available fields: {fields}")

except Exception as e:
    print(e)
