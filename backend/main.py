"""
TECHIFY main.py — Smart Audit Platform Backend
WITH NMAP + OPENVAS HYBRID SCANNING
"""
from fastapi import FastAPI, BackgroundTasks, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import asyncio, uvicorn, os, subprocess, shutil, psutil, time, re

from openvas_engine import run_openvas_scan, check_openvas_status
from ai_engine import get_ai_summary
from database import init_db
from report_gen import generate_pdf_report

# ── Device Discovery using Nmap ──────────────────────────────────────────────
def discover_assets(range_str):
    """Device discovery using Nmap ping scan"""
    print(f"\n[DISCOVERY] === DISCOVERY STARTED for {range_str} ===")
    devices = []
    
    try:
        try:
            subprocess.run(['nmap', '-V'], capture_output=True, timeout=5)
        except FileNotFoundError:
            print("[DISCOVERY] ⚠️  Nmap not found")
            return devices
        
        print("[DISCOVERY] Running Nmap ping scan...")
        result = subprocess.run(
            ['nmap', '-sn', '-T4', range_str],
            capture_output=True,
            timeout=120,
            text=True
        )
        
        if result.returncode != 0:
            return devices
        
        output = result.stdout
        lines = output.split('\n')
        current_ip = None
        current_hostname = None
        
        for line in lines:
            hostname_match = re.search(r'Nmap scan report for (\S+) \((\d+\.\d+\.\d+\.\d+)\)', line)
            if hostname_match:
                current_hostname = hostname_match.group(1)
                current_ip = hostname_match.group(2)
                continue
            
            ip_only_match = re.search(r'Nmap scan report for (\d+\.\d+\.\d+\.\d+)', line)
            if ip_only_match:
                current_ip = ip_only_match.group(1)
                current_hostname = None
                continue
            
            status_match = re.search(r'Host is (up|down)', line)
            if status_match and current_ip:
                if status_match.group(1).lower() == 'up':
                    device = {
                        "ip": current_ip,
                        "hostname": current_hostname or "unknown",
                        "status": "up"
                    }
                    devices.append(device)
                    print(f"[DISCOVERY] ✅ Found: {current_ip}")
                current_ip = None
        
        print(f"[DISCOVERY] Found {len(devices)} devices\n")
        return devices
        
    except Exception as e:
        print(f"[DISCOVERY] Error: {str(e)}")
        return devices

# ── NMAP VULNERABILITY SCANNING ──────────────────────────────────────────────
def scan_nmap_vulnerabilities(host):
    """Fast Nmap vulnerability scan - only common ports, 30 second timeout"""
    print(f"\n[NMAP_VULN] Starting Nmap vulnerability scan for {host}...")
    
    violations = []
    
    try:
        try:
            subprocess.run(['nmap', '-V'], capture_output=True, timeout=5)
        except FileNotFoundError:
            print("[NMAP_VULN] ⚠️  Nmap not installed")
            return violations
        
        # Only scan most common ports for speed
        common_ports = '20,21,22,25,53,80,110,143,389,443,465,993,995,3306,5432,5984,6379,8000,8001,8080,8443,8888,9200,9300,27017'
        
        nmap_cmd = [
            'nmap',
            '-sV',
            '-p', common_ports,
            '-T5',
            '--open',
            host
        ]
        
        result = subprocess.run(
            nmap_cmd,
            capture_output=True,
            timeout=30,
            text=True
        )
        
        output = result.stdout
        lines = output.split('\n')
        
        for line in lines:
            if 'open' in line.lower():
                match = re.search(r'(\d+)/(\w+)\s+(\w+)\s+(.*?)(?:\s{2,}|$)', line)
                if match:
                    port = match.group(1)
                    state = match.group(3)
                    service = match.group(4).strip()
                    
                    if state.lower() == 'open':
                        severity = "Low"
                        
                        high_risk = ['telnet', 'ftp', 'smtp', 'mysql', 'postgresql',
                                   'mongodb', 'redis', 'elasticsearch']
                        
                        if any(risk in service.lower() for risk in high_risk):
                            severity = "Medium"
                        
                        if 'telnet' in service.lower():
                            severity = "High"
                        
                        violation = {
                            "title": f"[NMAP] Port {port} - {service}",
                            "severity": severity,
                            "description": f"Open port detected: {service} on {port}",
                            "port": int(port),
                            "service": service,
                            "scanner": "Nmap"
                        }
                        
                        violations.append(violation)
                        print(f"[NMAP_VULN] {severity}: Port {port} - {service}")
        
        print(f"[NMAP_VULN] Found {len(violations)} open ports")
        return violations
        
    except subprocess.TimeoutExpired:
        print("[NMAP_VULN] ⚠️  Scan timed out")
        return violations
        
    except Exception as e:
        print(f"[NMAP_VULN] Error: {str(e)}")
        return violations

# ── OPENVAS VULNERABILITY SCANNING ───────────────────────────────────────────
def scan_openvas_vulnerabilities(host, openvas_config):
    """Run OpenVAS scan for deep vulnerability detection"""
    print(f"\n[OPENVAS_VULN] Starting OpenVAS scan for {host}...")
    
    violations = []
    
    if not openvas_config.get("enabled", False):
        print("[OPENVAS_VULN] ⚠️  OpenVAS disabled in config")
        return violations
    
    try:
        # Run OpenVAS scan
        ov_results = run_openvas_scan(
            host,
            openvas_config.get('host', '127.0.0.1'),
            openvas_config.get('port', 9390),
            openvas_config.get('username', 'admin'),
            openvas_config.get('password', 'ahsan.123'),
            openvas_config.get('scan_config', 'Full and fast')
        )
        
        # Tag results as from OpenVAS
        for result in ov_results:
            result['scanner'] = 'OpenVAS'
            violations.append(result)
        
        print(f"[OPENVAS_VULN] Found {len(violations)} vulnerabilities via OpenVAS")
        return violations
        
    except Exception as e:
        print(f"[OPENVAS_VULN] Error: {str(e)}")
        violation = {
            "title": "[OPENVAS] Scan Failed",
            "severity": "Low",
            "description": f"OpenVAS scan failed: {str(e)}. Nmap results still available.",
            "port": None,
            "service": "unknown",
            "scanner": "OpenVAS"
        }
        violations.append(violation)
        return violations

# ── App Setup ──────────────────────────────────────────────────────────────
from app.routers.auth_router import router as auth_router 
from app.deps import require_role, require_min_role, get_current_user, log_action, get_db
from app.models import User
from sqlalchemy.orm import Session

app = FastAPI(title="Techify Smart Audit Platform", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

all_devices_results = {}
CURRENT_TARGET      = {"host": "127.0.0.1"}
update_event        = asyncio.Event()
scan_progress       = {}

# ✅ ENABLE OPENVAS AND NMAP HYBRID SCANNING
OPENVAS_CONFIG = {
    "enabled": True,  # ← ENABLED NOW!
    "host": "127.0.0.1",
    "port": 9390,
    "username": "admin",
    "password": "ahsan.123",
    "scan_config": "Full and fast",
    "scan_mode": "hybrid",  # Both Nmap + OpenVAS
}

# ─────────────────────────────────────────────────────────────────────────────

def calculate_score(violations):
    score = 100
    for v in violations:
        score -= {"Critical": 20, "High": 15, "Medium": 10, "Low": 5}.get(v.get("severity","Low"), 5)
    return max(0, score)

async def perform_audit(host: str = None):
    """Perform security audit with NMAP + OPENVAS hybrid scanning"""
    target = host or CURRENT_TARGET["host"]
    
    print(f"\n{'='*70}")
    print(f"[AUDIT] === HYBRID SCAN STARTED for {target} ===")
    print(f"[AUDIT] Mode: Nmap + OpenVAS")
    print(f"[AUDIT] Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}")
    
    scan_progress[target] = {"progress": 5, "status": "Running", "engine": "Nmap + OpenVAS"}
    
    try:
        violations = []
        
        # ✅ STEP 1: RUN NMAP SCAN (Fast - 30 seconds)
        print("[AUDIT] Step 1/2: Running Nmap vulnerability scan...")
        scan_progress[target] = {"progress": 25, "status": "Running Nmap scan...", "engine": "Nmap + OpenVAS"}
        nmap_violations = scan_nmap_vulnerabilities(target)
        violations.extend(nmap_violations)
        print(f"[AUDIT] Nmap found: {len(nmap_violations)} issues")
        
        # ✅ STEP 2: RUN OPENVAS SCAN (Deep - may take longer)
        print("[AUDIT] Step 2/2: Running OpenVAS deep scan...")
        scan_progress[target] = {"progress": 50, "status": "Running OpenVAS scan...", "engine": "Nmap + OpenVAS"}
        openvas_violations = scan_openvas_vulnerabilities(target, OPENVAS_CONFIG)
        violations.extend(openvas_violations)
        print(f"[AUDIT] OpenVAS found: {len(openvas_violations)} issues")
        
        # Combine and deduplicate
        print(f"[AUDIT] Total vulnerabilities: {len(violations)}")
        
        # ✅ AI ANALYSIS
        print("[AUDIT] Getting AI analysis...")
        scan_progress[target] = {"progress": 75, "status": "Analyzing...", "engine": "Nmap + OpenVAS"}
        ai_summary = get_ai_summary(violations)
        
        # ✅ COMPLIANCE SCORE
        print("[AUDIT] Calculating compliance score...")
        compliance = calculate_score(violations)
        
        result = {
            "host": target, 
            "violations": violations,
            "ai_analysis": ai_summary,
            "compliance_score": compliance,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "scan_engine": "Nmap + OpenVAS (Hybrid)",
            "nmap_findings": len(nmap_violations),
            "openvas_findings": len(openvas_violations),
        }
        
        all_devices_results[target] = result
        scan_progress[target] = {"progress": 100, "status": "Done", "engine": "Nmap + OpenVAS"}
        
        print(f"[AUDIT] === HYBRID SCAN COMPLETED ===")
        print(f"[AUDIT] Nmap: {len(nmap_violations)} | OpenVAS: {len(openvas_violations)} | Total: {len(violations)}")
        print(f"[AUDIT] Compliance Score: {compliance}/100")
        print(f"{'='*70}\n")
        
        return result
        
    except Exception as e:
        print(f"[AUDIT] ❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        scan_progress[target] = {"progress": 0, "status": "Error", "engine": "", "error": str(e)}
        return None

@app.on_event("startup")
async def startup_event():
    print("\n[STARTUP] Initializing...")
    init_db()
    print("[STARTUP] Database initialized ✅")
    print("[STARTUP] Mode: Nmap + OpenVAS Hybrid Scanning")
    print("[STARTUP] Nmap: Port scanning (30 sec)")
    print("[STARTUP] OpenVAS: Deep vulnerability detection (enabled)")
    print("[STARTUP] Application ready ✅\n")
    asyncio.create_task(continuous_monitor())

async def continuous_monitor():
    while True:
        try:
            await perform_audit()
            try:
                await asyncio.wait_for(update_event.wait(), timeout=60)
                update_event.clear()
            except asyncio.TimeoutError:
                pass
        except Exception as e:
            print(f"[MONITOR] Error: {str(e)}")

# ── ROUTES ──────────────────────────────────────────────────────────────────

@app.get("/latest-audit")
async def get_audit(
    host: str = Query(default=None),
    user: User = Depends(require_min_role("viewer")),
):
    target = host or CURRENT_TARGET["host"]
    if target in all_devices_results:
        return all_devices_results[target]
    return await perform_audit(target) or {"host": target, "violations": [], "compliance_score": 100}

@app.get("/all-devices-audit")
async def all_audits(user: User = Depends(require_min_role("viewer"))):
    return all_devices_results

@app.get("/scan-progress/{host}")
async def scan_progress_endpoint(
    host: str,
    user: User = Depends(require_min_role("viewer")),
):
    return scan_progress.get(host, {"progress": 0, "status": "Idle", "engine": ""})

@app.post("/scan")
async def start_scan(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_min_role("analyst")),
    db:   Session = Depends(get_db),
):
    host = data.get("host", "127.0.0.1")
    CURRENT_TARGET["host"] = host
    background_tasks.add_task(perform_audit, host)
    log_action(db, user, "SCAN_STARTED", resource=host)
    return {"message": f"Hybrid scan started for {host}", "engine": "Nmap + OpenVAS"}

@app.post("/discover")
async def start_discovery(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_min_role("analyst")),
    db:   Session = Depends(get_db),
):
    range_str = data.get("range", "192.168.1.0/24")
    print(f"\n[API] Discovery for {range_str}")
    
    found = discover_assets(range_str)
    
    if found:
        for device in found:
            background_tasks.add_task(perform_audit, device.get('ip'))
    
    log_action(db, user, "DISCOVERY_RUN", resource=range_str)
    return {"devices": found, "all_results": all_devices_results}

@app.post("/remediate")
async def remediate(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_role(["superadmin", "admin"])),
    db:   Session = Depends(get_db),
):
    violation = data.get("violation", {})
    host = data.get("host", "127.0.0.1")
    port = violation.get("port")
    actions = []
    
    if host in ["127.0.0.1", "localhost"]:
        if port:
            subprocess.run(
                f'netsh advfirewall firewall add rule name="TECHIFY_BLOCK_{port}" '
                f'dir=in action=block protocol=TCP localport={port}',
                shell=True, capture_output=True,
            )
            actions.append(f"Port {port} blocked")
    
    log_action(db, user, "REMEDIATION_APPLIED", resource=host)
    return {"message": f"Applied: {', '.join(actions) if actions else 'None'}"}

@app.get("/live-stats/{host}")
async def live_stats(
    host: str,
    user: User = Depends(require_min_role("viewer")),
):
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "ram_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent,
    }

@app.get("/download-report")
async def download_report(
    host: str = Query(...),
    user: User = Depends(require_min_role("analyst")),
    db:   Session = Depends(get_db),
):
    report = all_devices_results.get(host)
    if not report:
        return {"error": "No scan data"}
    log_action(db, user, "REPORT_DOWNLOADED", resource=host)
    pdf_path = generate_pdf_report(report)
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"TECHIFY_{host.replace('.','_')}.pdf")

@app.get("/openvas/status")
async def openvas_status(user: User = Depends(require_min_role("analyst"))):
    status = check_openvas_status(
        OPENVAS_CONFIG.get("host", "127.0.0.1"),
        OPENVAS_CONFIG.get("port", 9390)
    )
    return {
        "running": OPENVAS_CONFIG.get("enabled", False),
        "message": "Nmap + OpenVAS Hybrid scanning enabled",
        "openvas_status": status,
        "config": {
            "enabled": OPENVAS_CONFIG.get("enabled"),
            "mode": "hybrid",
            "nmap": "Fast port scan (30s)",
            "openvas": "Deep vulnerability detection"
        }
    }

@app.post("/openvas/configure")
async def openvas_configure(
    data: dict,
    user: User = Depends(require_role(["superadmin", "admin"])),
    db:   Session = Depends(get_db),
):
    global OPENVAS_CONFIG
    for k in ["enabled","host","port","username","password","scan_config","scan_mode"]:
        if k in data:
            OPENVAS_CONFIG[k] = data[k]
    log_action(db, user, "OPENVAS_CONFIG_CHANGED")
    return {
        "success": True, 
        "message": "Configuration updated",
        "config": {k: v for k, v in OPENVAS_CONFIG.items() if k != "password"}
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)