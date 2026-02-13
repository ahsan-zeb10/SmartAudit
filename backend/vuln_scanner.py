import socket

VULN_DB = {
    21: {"service": "FTP", "issue": "Plaintext Authentication", "severity": "Medium"},
    22: {"service": "SSH", "issue": "Brute Force Potential", "severity": "Low"},
    23: {"service": "Telnet", "issue": "Unencrypted Communication", "severity": "High"},
    445: {"service": "SMB", "issue": "EternalBlue / WannaCry Risk", "severity": "Critical"},
    3389: {"service": "RDP", "issue": "Remote Access Risk", "severity": "High"},
}

def scan_vulnerabilities(target_ip):
    print(f"🛡️ Validating Ports on: {target_ip}")
    found_vulnerabilities = []
    
    # Critical ports to check
    target_ports = [21, 22, 23, 445, 3389]
    
    for port in target_ports:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        # connect_ex return 0 if port is OPEN
        result = s.connect_ex((target_ip, port))
        
        if result == 0:
            vuln_info = VULN_DB.get(port)
            found_vulnerabilities.append({
                "port": port,
                "service": vuln_info["service"],
                "issue": vuln_info["issue"],
                "severity": vuln_info["severity"]
            })
        s.close()
        
    return found_vulnerabilities