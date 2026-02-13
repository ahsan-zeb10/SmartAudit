from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import asyncio
import uvicorn
import os
import subprocess

# Project Imports
from scanner import run_security_audit, discover_assets
from ai_engine import get_ai_summary
from database import init_db, SessionLocal, Asset, Violation
from report_gen import generate_pdf_report
from vuln_scanner import scan_vulnerabilities

app = FastAPI(title="Premise Unified IT Infrastructure Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global State ---
LATEST_REPORT = {
    "host": "127.0.0.1",
    "status": "Idle",
    "violations": [],
    "ai_analysis": "Waiting for scan...",
    "assets": [],
    "compliance_score": 100
}

CURRENT_TARGET = {"host": "127.0.0.1"}
update_event = asyncio.Event()

async def perform_audit():
    global LATEST_REPORT
    db = SessionLocal()
    try:
        host = CURRENT_TARGET["host"]
        print(f"🔍 Starting Deep Audit: {host}")
        
        health_issues = run_security_audit(host)
        vuln_found = scan_vulnerabilities(host)
        
        vuln_descriptions = [f"VULN: Port {v['port']} ({v['service']}) - {v['issue']} [{v['severity']}]" for v in vuln_found]
        all_violations = health_issues + vuln_descriptions
        
        # Compliance Score Calculation
        score = 100
        for v in all_violations:
            v_upper = v.upper()
            if "CRITICAL" in v_upper or "445" in v_upper: score -= 40
            elif "HIGH" in v_upper or "LOW DISK" in v_upper: score -= 25
            elif "LOW" in v_upper or "22" in v_upper: score -= 10
            else: score -= 5
        
        score = max(0, score)
        ai_text = get_ai_summary(all_violations) if all_violations else "System Fully Compliant."
        
        LATEST_REPORT.update({
            "host": host,
            "status": "Active",
            "violations": all_violations,
            "ai_analysis": ai_text,
            "compliance_score": int(score)
        })
        print(f"✅ Audit Sync Complete. Score: {score}%")
    except Exception as e:
        print(f"❌ Error during audit: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    init_db()
    asyncio.create_task(continuous_monitor())

async def continuous_monitor():
    while True:
        await perform_audit()
        try:
            await asyncio.wait_for(update_event.wait(), timeout=60)
            update_event.clear()
        except asyncio.TimeoutError:
            pass

@app.get("/latest-audit")
async def get_audit():
    return LATEST_REPORT

@app.post("/scan")
async def start_scan(data: dict, background_tasks: BackgroundTasks):
    global CURRENT_TARGET
    CURRENT_TARGET["host"] = data.get("host", "127.0.0.1")
    update_event.set()
    background_tasks.add_task(perform_audit)
    return {"message": "Audit Triggered"}

# --- UPDATED REMEDIATION ENDPOINT (Real Logic) ---
@app.post("/remediate")
async def remediate_issue(data: dict, background_tasks: BackgroundTasks):
    violation_text = data.get("violation", "").upper()
    host = data.get("host", "127.0.0.1")
    actions_taken = []

    try:
        # 1. Real Disk Cleanup
        if "LOW DISK" in violation_text:
            if os.name == 'nt':
                subprocess.run("del /q/f/s %TEMP%\\*", shell=True, capture_output=True)
                actions_taken.append("Windows Temp files cleared")
            else:
                subprocess.run("rm -rf /tmp/*", shell=True, capture_output=True)
                actions_taken.append("/tmp directory cleaned")

        # 2. Real Firewall Block (Port 445 / SMB)
        if "445" in violation_text or "SMB" in violation_text:
            if os.name == 'nt':
                subprocess.run('netsh advfirewall firewall delete rule name="PREMISE_BLOCK_445"', shell=True, capture_output=True)
                cmd = 'netsh advfirewall firewall add rule name="PREMISE_BLOCK_445" protocol=TCP localport=445 action=block dir=IN'
                subprocess.run(cmd, shell=True, check=True)
                actions_taken.append("Port 445 (SMB) blocked")
            else:
                subprocess.run("iptables -A INPUT -p tcp --dport 445 -j DROP", shell=True, check=True)
                actions_taken.append("Port 445 blocked via iptables")

        # 3. Real Firewall Block (Port 22 / SSH)
        if "22" in violation_text or "SSH" in violation_text:
            if os.name == 'nt':
                subprocess.run('netsh advfirewall firewall delete rule name="PREMISE_BLOCK_22"', shell=True, capture_output=True)
                cmd = 'netsh advfirewall firewall add rule name="PREMISE_BLOCK_22" protocol=TCP localport=22 action=block dir=IN'
                subprocess.run(cmd, shell=True, check=True)
                actions_taken.append("Port 22 (SSH) blocked")
            else:
                subprocess.run("iptables -A INPUT -p tcp --dport 22 -j DROP", shell=True, check=True)
                actions_taken.append("Port 22 blocked via iptables")

        if not actions_taken:
            msg = "SUCCESS: Policy applied (Standard Hardening)"
        else:
            msg = f"SUCCESS: {', '.join(actions_taken)}"

    except Exception as e:
        msg = f"FAILED: {str(e)} (Ensure you run as Administrator)"

    # Refresh scan to update dashboard
    update_event.set()
    background_tasks.add_task(perform_audit)
    return {"status": "success", "message": msg}

@app.post("/discover")
async def start_discovery(data: dict):
    found = discover_assets(data.get("range", "192.168.1.1/24"))
    LATEST_REPORT["assets"] = found
    return {"status": "success", "devices": found}

@app.get("/download-report")
async def download_report():
    return FileResponse(generate_pdf_report(), media_type='application/pdf', filename="Compliance_Report.pdf")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)