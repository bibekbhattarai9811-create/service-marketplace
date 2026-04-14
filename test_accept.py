import urllib.request, json, time, base64, hmac, hashlib
import random

email = f'w{random.randint(1,99999)}@mail.com'
print("Registering", email)

req1 = urllib.request.Request('https://service-marketplace-16.onrender.com/register', method='POST')
req1.add_header('Content-Type', 'application/json')
payload1 = {"name": "w", "email": email, "phone": "1", "role": "worker", "password": "Password123!"}
with urllib.request.urlopen(req1, data=json.dumps(payload1).encode()) as res:
    print('REG SUCCESS:', res.read())

req2 = urllib.request.Request('https://service-marketplace-16.onrender.com/login', method='POST')
req2.add_header('Content-Type', 'application/json')
payload2 = {"email": email, "password": "Password123!"}
with urllib.request.urlopen(req2, data=json.dumps(payload2).encode()) as res:
    login_res = json.loads(res.read())
    token = login_res['token']
    print('LOGIN SUCCESS')

# FIND JOB
req_job = urllib.request.Request('https://service-marketplace-16.onrender.com/jobs/available-jobs')
with urllib.request.urlopen(req_job) as res:
    jobs = json.loads(res.read())
    if not jobs:
        print("NO AVAILABLE JOBS")
        exit()
    job_id = jobs[0]['id']
    print('FOUND JOB ID', job_id)

# CALL ACCEPT
req3 = urllib.request.Request(f'https://service-marketplace-16.onrender.com/jobs/accept-job?job_id={job_id}', method='POST')
req3.add_header('Authorization', f'Bearer {token}')
req3.add_header('Origin', 'https://service-marketplace-17.onrender.com')

try:
    with urllib.request.urlopen(req3) as res:
        print('ACCEPT SUCCESS:', res.read())
except urllib.error.HTTPError as e:
    print('ACCEPT ERROR:', e.code, e.read().decode('utf-8'))
