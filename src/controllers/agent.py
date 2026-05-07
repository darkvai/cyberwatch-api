import time
import random
import requests
from datetime import datetime

# ==========================================
# 1. CONFIGURATION
# ==========================================
# This is the URL where your Node.js server will receive logs
API_ENDPOINT = "http://localhost:5500/api/logs"

# Our simulated SOC environment (The targets)
ASSETS = [
    {"hostname": "web-server-01", "ip_address": "192.168.1.10"},
    {"hostname": "db-main", "ip_address": "192.168.1.50"},
    {"hostname": "auth-gateway", "ip_address": "192.168.1.25"},
    {"hostname": "workstation-hr", "ip_address": "192.168.2.105"},
    {"hostname": "workstation-dev", "ip_address": "192.168.2.202"}
]

# ==========================================
# 2. THREAT SIMULATION ENGINE
# ==========================================
def generate_log_event(asset):
    """Generates a realistic log event based on weighted probabilities."""
    
    # 80% chance of normal traffic, 15% suspicious, 5% critical attack
    scenario = random.choices(
        population=["Normal", "Suspicious", "Attack"],
        weights=[0.80, 0.15, 0.05],
        k=1
    )[0]

    if scenario == "Normal":
        events = [
            ("Successful Login", "User authenticated successfully via SSH.", "Low"),
            ("Service Started", "Nginx web service restarted.", "Low"),
            ("Health Check", "Routine system health check passed.", "Low"),
            ("File Access", "User read configuration file.", "Low")
        ]
    elif scenario == "Suspicious":
        events = [
            ("Failed Login", "Invalid password attempt for user 'root'.", "Medium"),
            ("Port Scan Detected", "Multiple connection attempts from external IP.", "Medium"),
            ("High CPU Usage", "CPU usage exceeded 85% for 5 minutes.", "Medium")
        ]
    else: # Attack
        events = [
            ("Brute Force Attack", "Repeated SSH login failures detected.", "High"),
            ("SQL Injection Attempt", "Malicious payload detected in web request.", "Critical"),
            ("Malware Signature", "Known ransomware signature detected in memory.", "Critical"),
            ("Unauthorized Access", "Privilege escalation detected.", "Critical")
        ]

    event_type, message, severity = random.choice(events)

    # Construct the exact JSON payload expected by our Mongoose Controller
    return {
        "hostname": asset["hostname"],
        "ip_address": asset["ip_address"],
        "event_type": event_type,
        "message": message,
        "severity": severity
    }

# ==========================================
# 3. EXECUTION LOOP
# ==========================================
def run_agent():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🛡️ CyberWatch Agent Started.")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 📡 Targeting backend: {API_ENDPOINT}")
    print("-" * 50)

    try:
        while True:
            # 1. Pick a random machine from our network
            target_asset = random.choice(ASSETS)
            
            # 2. Generate a simulated event for that machine
            payload = generate_log_event(target_asset)
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Preparing to send {payload['severity']} severity event from {payload['hostname']}...")

            try:
                # 3. Send the HTTP POST request to the Node.js backend
                response = requests.post(API_ENDPOINT, json=payload, timeout=5)
                
                if response.status_code == 201 or response.status_code == 200:
                    print(f"✅ Success: Log safely transmitted to SOC.")
                else:
                    print(f"⚠️ Warning: Backend returned status {response.status_code}")
                    print(f"Response: {response.text}")
                    
            except requests.exceptions.ConnectionError:
                print(f"❌ Error: Could not connect to backend at {API_ENDPOINT}. Is the Node server running?")
            
            print("-" * 50)
            
            # 4. Sleep for a random interval to mimic real, organic traffic
            time.sleep(random.uniform(1.0, 4.0))

    except KeyboardInterrupt:
        print("\n🛑 Agent stopped by user. Shutting down gracefully.")

if __name__ == "__main__":
    run_agent()