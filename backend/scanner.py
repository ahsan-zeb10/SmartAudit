import nmap
import os
import psutil
import platform
import subprocess
import shutil
import socket

os.environ['PATH'] += r';C:\Program Files (x86)\Nmap'
os.environ['PATH'] += r';C:\Program Files\Nmap'

# ─────────────────────────────────────────────────────────────────────────────
# Vendor → Device Type mapping (MAC vendor prefix based)
# ─────────────────────────────────────────────────────────────────────────────
VENDOR_DEVICE_MAP = [
    # Routers / Network gear
    (['d-link', 'dlink'],                           ('Router/Switch', '🔌', 'Network Device')),
    (['tp-link', 'tplink'],                         ('Router/Switch', '🔌', 'Network Device')),
    (['netgear'],                                   ('Router/Switch', '🔌', 'Network Device')),
    (['cisco'],                                     ('Router/Switch', '🔌', 'Cisco IOS')),
    (['juniper'],                                   ('Router/Switch', '🔌', 'Juniper JunOS')),
    (['mikrotik'],                                  ('Router/Switch', '🔌', 'RouterOS')),
    (['asus'],                                      ('Router/Switch', '🔌', 'Network Device')),
    (['ubiquiti', 'ubnt'],                          ('Access Point', '📡', 'UniFi OS')),
    (['huawei'],                                    ('Router/Switch', '🔌', 'Huawei VRP')),
    (['zte'],                                       ('Router/Switch', '🔌', 'ZTE OS')),
    # Mobile
    (['samsung'],                                   ('Android Phone', '📱', 'Android')),
    (['xiaomi', 'miui'],                            ('Android Phone', '📱', 'Android (MIUI)')),
    (['oppo'],                                      ('Android Phone', '📱', 'Android (ColorOS)')),
    (['vivo'],                                      ('Android Phone', '📱', 'Android (FuntouchOS)')),
    (['oneplus'],                                   ('Android Phone', '📱', 'Android (OxygenOS)')),
    (['realme'],                                    ('Android Phone', '📱', 'Android (realmeUI)')),
    (['apple'],                                     ('Apple Device', '🍎', 'iOS / macOS')),
    # PCs
    (['dell'],                                      ('Windows/Linux PC', '🖥️', 'Windows/Linux')),
    (['hp', 'hewlett'],                             ('Windows/Linux PC', '🖥️', 'Windows/Linux')),
    (['lenovo'],                                    ('Windows/Linux PC', '🖥️', 'Windows/Linux')),
    (['intel'],                                     ('Desktop/Laptop', '💻', 'Windows/Linux')),
    (['acer'],                                      ('Laptop', '💻', 'Windows/Linux')),
    (['msi'],                                       ('Gaming PC', '🎮', 'Windows')),
    (['gigabyte'],                                  ('Desktop PC', '🖥️', 'Windows/Linux')),
    (['asustek'],                                   ('Desktop/Laptop', '💻', 'Windows/Linux')),
    # IoT / Cameras / TVs
    (['hikvision'],                                 ('IP Camera', '📷', 'Embedded Linux')),
    (['dahua'],                                     ('IP Camera', '📷', 'Embedded Linux')),
    (['sony'],                                      ('Smart TV / Device', '📺', 'Android TV')),
    (['lg'],                                        ('Smart TV', '📺', 'webOS')),
    (['raspberry'],                                 ('IoT Device', '🔧', 'Raspberry Pi OS')),
    # Printers
    (['canon'],                                     ('Printer', '🖨️', 'Embedded OS')),
    (['epson'],                                     ('Printer', '🖨️', 'Embedded OS')),
    (['brother'],                                   ('Printer', '🖨️', 'Embedded OS')),
    (['xerox'],                                     ('Printer', '🖨️', 'Embedded OS')),
]

def get_device_from_vendor(vendor: str):
    """Match vendor string to device type/OS"""
    vendor_lower = vendor.lower()
    for keywords, result in VENDOR_DEVICE_MAP:
        if any(kw in vendor_lower for kw in keywords):
            return result  # (device_type, icon, os_guess)
    return None


def get_device_from_nmap_os(osmatch_list: list):
    """Extract best OS name and device type from nmap osmatch"""
    if not osmatch_list:
        return None, None, None, 0

    best = osmatch_list[0]
    os_name = best.get('name', 'Unknown')
    accuracy = int(best.get('accuracy', 0))
    os_family = ''
    device_type_raw = ''

    if 'osclass' in best and best['osclass']:
        cls = best['osclass'][0]
        os_family = cls.get('osfamily', '')
        device_type_raw = cls.get('type', '')

    combined = (os_name + ' ' + os_family + ' ' + device_type_raw).lower()

    if 'windows' in combined:
        return os_name, 'Windows PC', '🖥️', accuracy
    if 'android' in combined:
        return os_name, 'Android Phone', '📱', accuracy
    if 'ios' in combined or 'iphone' in combined or 'ipad' in combined:
        return os_name, 'Apple iOS', '📱', accuracy
    if 'mac os' in combined or 'darwin' in combined:
        return os_name, 'macOS', '🍎', accuracy
    if 'linux' in combined:
        return os_name, 'Linux Device', '🐧', accuracy
    if 'router' in combined or 'firewall' in combined or 'switch' in combined:
        return os_name, 'Router/Switch', '🔌', accuracy
    if 'printer' in combined:
        return os_name, 'Printer', '🖨️', accuracy
    if 'embedded' in combined or 'broadband' in combined:
        return os_name, 'Embedded Device', '🔧', accuracy

    return os_name, 'Network Device', '❓', accuracy


def try_get_hostname(ip: str) -> str:
    """Reverse DNS lookup"""
    try:
        name = socket.gethostbyaddr(ip)[0]
        return name
    except:
        return ip


# ─────────────────────────────────────────────────────────────────────────────
# DISCOVER ASSETS
# ─────────────────────────────────────────────────────────────────────────────
def discover_assets(ip_range: str):
    print(f"📡 Discovery on: {ip_range}")
    devices = []
    nm_ping = nmap.PortScanner()
    nm_os   = nmap.PortScanner()

    # Step 1: Fast ping sweep to find alive hosts
    try:
        nm_ping.scan(
            hosts=ip_range,
            arguments='-sn -PE -PP -PS80,443 -PA22,3389 -T4 --min-parallelism 100'
        )
    except Exception as e:
        print(f"Ping scan error: {e}")
        return [{"ip": ip_range.split('/')[0], "status": "Fallback",
                 "os_name": "Unknown", "device_type": "Unknown Device",
                 "device_icon": "❓", "open_ports": [], "hostname": ip_range.split('/')[0]}]

    alive_hosts = [h for h in nm_ping.all_hosts() if nm_ping[h].state() == 'up']
    print(f"  → {len(alive_hosts)} alive hosts found: {alive_hosts}")

    if not alive_hosts:
        return []

    # Step 2: OS detection + service scan on alive hosts
    hosts_str = ' '.join(alive_hosts[:30])
    try:
        nm_os.scan(
            hosts=hosts_str,
            arguments='-O -sV --osscan-guess --version-intensity 5 -T4 --open -p 22,23,80,135,139,443,445,3389,8080,8443'
        )
        print("  → OS detection scan complete")
    except Exception as e:
        print(f"  OS scan error (may need admin): {e}")

    for host in alive_hosts:
        # --- Basic info from ping scan ---
        hostname = try_get_hostname(host)
        mac = "N/A"
        vendor = "N/A"

        if host in nm_ping.all_hosts():
            h = nm_ping[host]
            if 'addresses' in h and 'mac' in h['addresses']:
                mac = h['addresses']['mac']
            if 'vendor' in h and h['vendor']:
                vendor = list(h['vendor'].values())[0]
            if h.hostname():
                hostname = h.hostname()

        # --- OS + service info from OS scan ---
        os_name = "Unknown"
        device_type = "Unknown Device"
        device_icon = "❓"
        os_accuracy = 0
        open_ports = []

        if host in nm_os.all_hosts():
            h_os = nm_os[host]

            # Hostname from OS scan (may be more accurate)
            if h_os.hostname():
                hostname = h_os.hostname()

            # MAC from OS scan too
            if 'addresses' in h_os and 'mac' in h_os['addresses'] and mac == "N/A":
                mac = h_os['addresses']['mac']
            if 'vendor' in h_os and h_os['vendor'] and vendor == "N/A":
                vendor = list(h_os['vendor'].values())[0]

            # OS match
            osmatch = h_os.get('osmatch', [])
            if osmatch:
                os_name, device_type, device_icon, os_accuracy = get_device_from_nmap_os(osmatch)

            # Open ports
            if 'tcp' in h_os:
                for port, info in h_os['tcp'].items():
                    if info['state'] == 'open':
                        open_ports.append({
                            'port': port,
                            'service': info.get('name', ''),
                            'product': info.get('product', ''),
                            'version': info.get('version', ''),
                        })

        # --- Fallback: infer from vendor if OS unknown ---
        if (os_name == "Unknown" or device_type == "Unknown Device") and vendor != "N/A":
            result = get_device_from_vendor(vendor)
            if result:
                device_type, device_icon, os_name = result
                if os_accuracy == 0:
                    os_accuracy = 0  # vendor-based, not nmap
                    os_name = f"{os_name} (vendor-based)"

        # --- Fallback: infer from open ports ---
        if device_type == "Unknown Device":
            port_nums = [p['port'] for p in open_ports]
            if 3389 in port_nums:
                device_type, device_icon, os_name = 'Windows PC', '🖥️', 'Windows (RDP open)'
            elif 22 in port_nums and 80 in port_nums:
                device_type, device_icon, os_name = 'Linux Server', '🐧', 'Linux (SSH+HTTP)'
            elif 80 in port_nums or 443 in port_nums:
                device_type, device_icon = 'Network Device', '🌐'

        # Clean up hostname
        if hostname == host:
            hostname = f"Device-{host.split('.')[-1]}"

        devices.append({
            "ip": host,
            "hostname": hostname,
            "mac": mac,
            "vendor": vendor,
            "status": "Online",
            "os_name": os_name,
            "os_accuracy": os_accuracy,
            "device_type": device_type,
            "device_icon": device_icon,
            "open_ports": open_ports[:12],
        })
        print(f"  ✓ {host} → {device_type} | OS: {os_name} | Vendor: {vendor}")

    return devices


# ─────────────────────────────────────────────────────────────────────────────
# SECURITY AUDIT
# ─────────────────────────────────────────────────────────────────────────────
def run_security_audit(target_ip: str):
    violations = []

    # Local machine checks
    if target_ip in ['127.0.0.1', 'localhost']:
        try:
            usage = psutil.disk_usage('/')
            if usage.percent > 80:
                violations.append({"id": "POLICY-13-DISK", "title": "Policy 13: High Disk Usage", "severity": "Medium",
                                    "description": f"Disk {usage.percent:.1f}% full", "port": None, "service": "Disk", "fix": "Automatic cleanup available"})
            cpu = psutil.cpu_percent(interval=1)
            if cpu > 85:
                violations.append({"id": "POLICY-13-CPU", "title": "Policy 13: High CPU Usage", "severity": "Medium",
                                    "description": f"CPU at {cpu}%", "port": None, "service": "CPU", "fix": "Review running processes"})
            ram = psutil.virtual_memory()
            if ram.percent > 90:
                violations.append({"id": "POLICY-13-RAM", "title": "Policy 13: High RAM Usage", "severity": "Medium",
                                    "description": f"RAM {ram.percent}% used", "port": None, "service": "Memory", "fix": "Close heavy apps"})
            try:
                r = subprocess.run('powershell -Command "Get-Service -Name WinDefend"', capture_output=True, text=True, timeout=5)
                if "Running" not in r.stdout:
                    violations.append({"id": "POLICY-8-AV", "title": "Policy 8: Windows Defender Not Running", "severity": "Critical",
                                        "description": "Antivirus/EDR disabled", "port": None, "service": "Security", "fix": "Enable Windows Defender"})
            except: pass
            try:
                r = subprocess.run('powershell -Command "Get-BitLockerVolume -MountPoint C:"', capture_output=True, text=True, timeout=5)
                if "FullyEncrypted" not in r.stdout and "Encrypted" not in r.stdout:
                    violations.append({"id": "POLICY-9-ENCRYPT", "title": "Policy 9: Disk Not Encrypted", "severity": "High",
                                        "description": "System drive not BitLocker encrypted", "port": None, "service": "Encryption", "fix": "Enable BitLocker"})
            except: pass
        except: pass

    # Nmap port scan
    try:
        nm = nmap.PortScanner()
        print(f"🔍 Port scanning {target_ip}...")
        nm.scan(target_ip, '22,23,135,139,445,3389,1433,3306,5432,5900,8080', arguments='-sV -T4 --open')
        for host in nm.all_hosts():
            if 'tcp' in nm[host]:
                for port in nm[host]['tcp']:
                    info = nm[host]['tcp'][port]
                    if info['state'] == 'open':
                        service = info['name']
                        desc = f"{info.get('product','')} {info.get('version','')}".strip() or service
                        sev, title, fix = "Medium", f"{service.upper()} Exposed on Port {port}", "Block via firewall"
                        if port in [22, 3389]:
                            sev, title = "Critical", f"Policy 4: Dangerous Port {port} Open ({service.upper()})"
                        elif port == 445:
                            sev, title = "Critical", "Policy 4: SMB Port 445 Open (EternalBlue Risk)"
                        elif port == 23:
                            sev, title = "High", "Telnet Exposed (Unencrypted)"
                        elif port in [1433, 3306, 5432]:
                            sev, title = "High", f"Database Port {port} Exposed"
                        violations.append({"id": f"PORT-{port}", "title": title, "severity": sev,
                                           "description": desc, "port": port, "service": service, "fix": fix})
    except Exception as e:
        violations.append({"id": "SCAN-ERR", "title": "Scan Error", "severity": "Low",
                           "description": str(e)[:120], "port": None, "fix": "Check network connectivity"})

    return violations