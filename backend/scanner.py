import nmap
import os
import psutil
import platform
import subprocess
import shutil

# Windows PATH fix for python-nmap
os.environ['PATH'] += r';C:\Program Files (x86)\Nmap'
os.environ['PATH'] += r';C:\Program Files\Nmap'

def discover_assets(ip_range):
    print(f"📡 Advanced Discovery on: {ip_range}")
    devices = []
    try:
        nm = nmap.PortScanner()
        # More aggressive host discovery: -PE -PP -PS80,443 -PA21,22 -T4
        nm.scan(hosts=ip_range, arguments='-sn -PE -PP -PS80,443 -PA22,3389 -T4 --min-hostgroup 64 --min-parallelism 100')
        
        for host in nm.all_hosts():
            if nm[host].state() == 'up':
                hostname = nm[host].hostname() or "Unknown"
                mac = "N/A"
                vendor = "N/A"
                if 'addresses' in nm[host] and 'mac' in nm[host]['addresses']:
                    mac = nm[host]['addresses']['mac']
                if 'vendor' in nm[host]:
                    vendor = list(nm[host]['vendor'].values())[0] if nm[host]['vendor'] else "Unknown"
                
                devices.append({
                    "ip": host,
                    "hostname": hostname,
                    "mac": mac,
                    "vendor": vendor,
                    "status": "Online"
                })
        print(f"Found {len(devices)} devices: {[d['ip'] for d in devices]}")
    except Exception as e:
        print(f"Discovery error: {e}")
        devices = [{"ip": ip_range.split('/')[0], "status": "Fallback"}]
    return devices

def run_security_audit(target_ip):
    violations = []

    # Local Resource Checks (Policy 13)
    if target_ip in ['127.0.0.1', 'localhost']:
        try:
            # Disk Usage
            usage = psutil.disk_usage('/')
            if usage.percent > 80:
                violations.append({
                    "id": "POLICY-13-DISK", "title": "Policy 13: High Disk Usage",
                    "severity": "Medium", "description": f"Disk {usage.percent}% full - Risk of crash",
                    "port": None, "service": "Disk", "fix": "Automatic cleanup available"
                })

            # CPU Usage
            cpu = psutil.cpu_percent(interval=1)
            if cpu > 85:
                violations.append({
                    "id": "POLICY-13-CPU", "title": "Policy 13: High CPU Usage",
                    "severity": "Medium", "description": f"CPU {cpu}% - Sustained high load",
                    "port": None, "service": "CPU", "fix": "Review processes"
                })

            # RAM Usage
            ram = psutil.virtual_memory()
            if ram.percent > 90:
                violations.append({
                    "id": "POLICY-13-RAM", "title": "Policy 13: High RAM Usage",
                    "severity": "Medium", "description": f"RAM {ram.percent}% used",
                    "port": None, "service": "Memory", "fix": "Close heavy apps"
                })

            # Antivirus Check (Policy 8)
            try:
                defender = subprocess.run('powershell -Command "Get-Service -Name WinDefend"', capture_output=True, text=True)
                if "Running" not in defender.stdout:
                    violations.append({
                        "id": "POLICY-8-AV", "title": "Policy 8: Windows Defender Not Running",
                        "severity": "Critical", "description": "Antivirus/EDR disabled",
                        "port": None, "service": "Security", "fix": "Enable Defender"
                    })
            except:
                pass

            # Disk Encryption Check (Policy 9 - BitLocker)
            try:
                bitlocker = subprocess.run('powershell -Command "Get-BitLockerVolume -MountPoint C:"', capture_output=True, text=True)
                if "FullyEncrypted" not in bitlocker.stdout and "Encrypted" not in bitlocker.stdout:
                    violations.append({
                        "id": "POLICY-9-ENCRYPT", "title": "Policy 9: Disk Not Encrypted",
                        "severity": "High", "description": "System drive not BitLocker encrypted",
                        "port": None, "service": "Encryption", "fix": "Enable BitLocker"
                    })
            except:
                pass
        except:
            pass

    # Nmap Scan for Exposed Ports (Policy 4 - No public RDP/SSH + general dangerous ports)
    try:
        nm = nmap.PortScanner()
        print(f"🔍 Nmap scanning {target_ip}...")
        nm.scan(target_ip, '22,23,135,139,445,3389,1433,3306,5432,5900,8080', arguments='-sV -T4 --open')

        for host in nm.all_hosts():
            if 'tcp' in nm[host]:
                for port in nm[host]['tcp']:
                    info = nm[host]['tcp'][port]
                    if info['state'] == 'open':
                        service = info['name']
                        sev = "Medium"
                        title = f"{service.upper()} Exposed on Port {port}"
                        desc = f"{info.get('product', '')} {info.get('version', '')}"
                        fix = "Block via firewall"

                        if port in [22, 3389]:  # SSH/RDP - Policy 4
                            sev = "Critical"
                            title = f"Policy 4: Dangerous Port {port} Exposed"
                            desc = "RDP/SSH should not be internet-facing"
                        elif port == 445:
                            sev = "Critical"
                            title = "Policy 4: SMB Exposed (EternalBlue Risk)"
                        elif port == 23:
                            sev = "High"
                            title = "Telnet Exposed (Insecure)"
                        elif port in [1433, 3306, 5432]:
                            sev = "High"
                            title = f"Database Port {port} Exposed"

                        violations.append({
                            "id": f"POLICY-4-PORT-{port}", "title": title, "severity": sev,
                            "description": desc, "port": port, "service": service, "fix": fix
                        })
    except Exception as e:
        violations.append({
            "id": "SCAN-ERR", "title": "Scan Error", "severity": "Low",
            "description": str(e)[:100], "port": None, "fix": "Check network"
        })

    return violations