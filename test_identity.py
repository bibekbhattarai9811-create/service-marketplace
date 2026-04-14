import urllib.request, json, time, base64, hmac, hashlib

secret = 'service-marketplace-dev-secret'.encode('utf-8')
payload = {"user_id": 49, "role": "worker", "type": "access", "exp": int(time.time()) + 3600}
payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8').rstrip('=')
sig = hmac.new(secret, payload_b64.encode('utf-8'), hashlib.sha256).digest()
sig_b64 = base64.urlsafe_b64encode(sig).decode('utf-8').rstrip('=')
token = f'{payload_b64}.{sig_b64}'

req = urllib.request.Request('https://service-marketplace-16.onrender.com/stripe/create-identity-session', method='POST')
req.add_header('Authorization', f'Bearer {token}')
req.add_header('Origin', 'https://service-marketplace-17.onrender.com')
try:
    with urllib.request.urlopen(req) as response:
        print('SUCCESS:', response.read())
except urllib.error.HTTPError as e:
    print('ERROR:', e.code, e.read().decode('utf-8'))
