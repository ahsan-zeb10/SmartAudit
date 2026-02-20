from fastapi import FastAPI, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import asyncio
import uvicorn
import os
import subprocess
import shutil
import psutil
import time

# Custom Modules
from scanner import run_security_audit, discover_assets
from ai_engine import get_ai_summary
from database import init_db
from report_gen import generate_pdf_report

app = FastAPI(title="Techify Smart Audit Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
LATEST_REPORT = {
    "host": "127.0.0.1",
    "violations": [],
    "ai_analysis": "System ready...",
    "assets": [],
    "compliance_score": 100
}
all_devices_results = {}
CURRENT_TARGET = {"host": "127.0.0.1"}
update_event = asyncio.Event()
approved_devices = set() 

def calculate_score(violations):
    score = 100
    penalty = 0
    weights = {"Critical": 20, "High": 15, "Medium": 10, "Low": 5}
    for v in violations:
        penalty += weights.get(v.get('severity'), 5)
    return max(0, score - penalty)

async def perform_audit(host=None):
    global LATEST_REPORT, all_devices_results
    target = host or CURRENT_TARGET["host"]
    try:
        violations = run_security_audit(target)
        score = calculate_score(violations)
        ai_text = get_ai_summary(violations)
        
        report_data = {
            "host": target,
            "violations": violations,
            "ai_analysis": ai_text,
            "compliance_score": score,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        all_devices_results[target] = report_data
        if target == CURRENT_TARGET["host"]:
            LATEST_REPORT.update(report_data)
        return report_data
    except Exception as e:
        print(f"Error: {e}")
        return None

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
    return {"message": "Audit Started"}

@app.post("/discover")
async def start_discovery(data: dict):
    found = discover_assets(data.get("range", "192.168.1.1/24"))
    new_devices = []
    for device in found:
        ip, mac = device.get('ip'), device.get('mac', 'unknown')
        if (ip, mac) not in approved_devices:
            new_devices.append(device)
        await perform_audit(ip)
    return {"devices": found, "all_results": all_devices_results, "new_devices": new_devices}

@app.post("/remediate")
async def remediate_issue(data: dict, background_tasks: BackgroundTasks):
    violation = data.get("violation", {})
    host = data.get("host", "127.0.0.1")
    title = violation.get("title", "").upper()
    port = violation.get("port")
    actions = []
    
    if host in ["127.0.0.1", "localhost"]:
        if "DISK" in title:
            shutil.rmtree(os.path.expandvars(r'%TEMP%'), ignore_errors=True)
            actions.append("Disk Cleaned")
        if port:
            subprocess.run(f'netsh advfirewall firewall add rule name="BLOCK_{port}" dir=in action=block protocol=TCP localport={port}', shell=True)
            actions.append(f"Port {port} Blocked")
    
    update_event.set()
    return {"message": f"Remediation Applied: {', '.join(actions)}"}

@app.get("/live-stats/{host}")
async def get_live_stats(host: str):
    return {
        "cpu_percent": psutil.cpu_percent(),
        "ram_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }

@app.get("/download-report")
async def download_report(host: str = Query(...)):
    report = all_devices_results.get(host)
    if not report:
        return {"error": "No audit data found for this host. Please run audit first."}
    
    pdf_path = generate_pdf_report(report)
    return FileResponse(
        pdf_path,
        media_type='application/pdf',
        filename=f"TECHIFY_Smart_Audit_Report_{host}.pdf"
    )
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)