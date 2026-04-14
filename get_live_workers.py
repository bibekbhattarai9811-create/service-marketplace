import urllib.request, json
try:
    req = urllib.request.Request('https://service-marketplace-16.onrender.com/workers')
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
        print(f"Loaded {len(data)} workers")
        for w in data:
            print(f"ID {w['id']}: Name: '{w['name']}'")
except Exception as e:
    print('ERROR:', e)
