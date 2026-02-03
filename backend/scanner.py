import paramiko

class ServerAuditor:
    def __init__(self, host, username, password):
        self.host = host
        self.username = username
        self.password = password

    def run_audit(self):
        # --- OPTION C: DEMO MODE ---
        # Agar host 'demo' ho ya '127.0.0.1' ho, toh real SSH nahi karega
        if self.host.lower() == "demo" or self.host == "127.0.0.1":
            return {
                "status": "Success (Demo Mode)",
                "raw_data": {
                    "ports": "tcp 0 0 0.0.0.0:3389 0.0.0.0:* LISTEN\ntcp 0 0 0.0.0.0:22 0.0.0.0:* LISTEN",
                    "inactive_users": "admin_user: last logged in 45 days ago\nguest_user: last logged in 60 days ago"
                },
                "violations": [
                    "POLICY 4 VIOLATION: Dangerous port 3389 (RDP) is exposed to the public internet!",
                    "POLICY 2 VIOLATION: Inactive accounts detected (admin_user, guest_user) - inactive for more than 30 days."
                ]
            }

        # --- REAL SSH MODE ---
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            client.connect(self.host, username=self.username, password=self.password, timeout=10)
            
            # Policy 4 Check: Open Ports
            stdin, stdout, stderr = client.exec_command("netstat -tuln")
            ports_output = stdout.read().decode()
            
            # Policy 2 Check: Inactive Users
            stdin, stdout, stderr = client.exec_command("lastlog -b 30")
            users_output = stdout.read().decode()

            client.close()

            # Real Data Evaluation Logic
            violations = []
            if "3389" in ports_output:
                violations.append("POLICY 4 VIOLATION: Dangerous port 3389 (RDP) is open!")
            
            if users_output.strip():
                violations.append("POLICY 2 VIOLATION: Inactive users found (30+ days).")

            return {
                "status": "Success",
                "raw_data": {"ports": ports_output, "inactive_users": users_output},
                "violations": violations
            }

        except Exception as e:
            return {"status": "Error", "message": str(e)}