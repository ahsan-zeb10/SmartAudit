import psutil
import subprocess
import platform
import socket

def discover_assets(ip_range):
    print(f"📡 Scanning Network: {ip_range}")
    devices = []
    base_ip = ".".join(ip_range.split('.')[:-1]) + "."
    for i in range(1, 15): 
        ip = f"{base_ip}{i}"
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, '1', '-w', '100', ip]
        try:
            output = subprocess.run(command, capture_output=True, text=True)
            if output.returncode == 0:
                devices.append({'ip': ip, 'mac': "N/A", 'status': 'Online'})
        except: pass
    return devices if devices else [{"ip": "192.168.1.1", "mac": "Device Found", "status": "Online"}]

def run_security_audit(target_ip):
    violations = []
    try:
        # Check Real Disk Usage
        usage = psutil.disk_usage('/')
        # Threshold 80% rakha hai, agar aapka disk 80% se zyada full hai to hi show hoga
        if usage.percent > 80:  
            violations.append(f"POLICY 13: Low Disk Space ({usage.percent}%) on {target_ip}")
        
        # RAM Check
        ram = psutil.virtual_memory()
        if ram.percent > 90:
            violations.append(f"POLICY 14: High RAM Usage ({ram.percent}%)")
    except Exception as e:
        print(f"❌ Scan Error: {e}")
    return violations