import time, subprocess
print("Polling Render for deployment status...")
for i in range(30):
    res = subprocess.run(["python", "test_accept.py"], capture_output=True, text=True)
    if "ACCEPT SUCCESS" in res.stdout:
        print("DEPLOYMENT DETECTED! READY!\n", res.stdout)
        exit(0)
    elif "NO AVAILABLE JOBS" in res.stdout:
        print("Waiting for an open job to appear...")
        time.sleep(10)
    else:
        print(f"Deploy still pending... Attempt {i+1}")
        time.sleep(10)
print("Timeout waiting for deploy.")
