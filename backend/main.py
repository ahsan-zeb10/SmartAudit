from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import asyncio
import uvicorn
import os
import subprocess
import shutil

# Project Imports
from scanner import run_security_audit, discover_assets
from ai_engine import get_ai_summary
from database import init_db, SessionLocal
from report_gen import generate_pdf_report  # ← Ensure yeh file exist karti hai

app = FastAPI(title="TECHIFY Infrastructure Platform")

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

CURRENT_TARGET = {"host": "127.0.0.1"}
update_event = asyncio.Event()

async def perform_audit():
    global LATEST_REPORT
    try:
        host = CURRENT_TARGET["host"]
        print(f"🔍 Starting Deep Audit: {host}")

        violations = run_security_audit(host)

        # --- Corrected Indentation Starts Here ---
        score = 100
        critical_count = 0
        high_count = 0
        
        for v in violations:
            sev = v.get('severity', 'Low')
            if sev == "Critical":
                critical_count += 1
                score -= 25  # Kam cut Critical ke liye
            elif sev == "High": 
                score -= 15
            elif sev == "Medium": 
                score -= 8
            else: 
                score -= 4

        # Bonus: Agar Critical > 0 toh extra penalty
        if critical_count > 0:
            score -= 10 * critical_count  # Multiple Critical pe heavy hit

        score = max(10, score)  # Minimum 10%
        # --- Corrected Indentation Ends Here ---

        ai_text = get_ai_summary(violations)

        LATEST_REPORT.update({
            "host": host,
            "violations": violations,
            "ai_analysis": ai_text,
            "compliance_score": int(score)
        })
        print(f"✅ Audit Complete → {len(violations)} violations | Score: {score}%")
    except Exception as e:
        print(f"❌ Audit Error: {e}")

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

@app.post("/remediate")
async def remediate_issue(data: dict, background_tasks: BackgroundTasks):
    violation = data.get("violation", {})
    host = data.get("host", LATEST_REPORT.get("host", "127.0.0.1"))
    title = violation.get("title", "").upper() if isinstance(violation, dict) else ""
    id_val = violation.get("id", "") if isinstance(violation, dict) else ""
    port = violation.get("port") if isinstance(violation, dict) else None
    actions = []
    is_local = host in ["127.0.0.1", "localhost", "::1"]

    try:
        if is_local:
            if "DISK" in title or "POLICY-13-DISK" in id_val:
                temp_dir = os.path.expandvars(r'%TEMP%')
                shutil.rmtree(temp_dir, ignore_errors=True)
                os.makedirs(temp_dir, exist_ok=True)
                actions.append("Temp cleared")

                subprocess.run('powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', shell=True)
                actions.append("Recycle Bin emptied")

            if port:
                rule_name = f"TECHIFY_BLOCK_{port}"
                subprocess.run(f'netsh advfirewall firewall delete rule name="{rule_name}"', shell=True)
                subprocess.run(f'netsh advfirewall firewall add rule name="{rule_name}" dir=in action=block protocol=TCP localport={port}', shell=True)
                actions.append(f"Port {port} blocked")

                if port == 445:
                    subprocess.run('powershell -Command "Stop-Service -Name LanmanServer -Force"', shell=True)
                    actions.append("SMB stopped")
                elif port == 22:
                    subprocess.run('powershell -Command "Stop-Service -Name sshd -Force"', shell=True)
                    actions.append("SSH stopped")
                elif port == 5432:
                    subprocess.run('powershell -Command "Stop-Service -Name postgresql* -Force"', shell=True)
                    actions.append("PostgreSQL stopped")

            if actions:
                msg = f"SUCCESS (Local): {', '.join(actions)}. Re-scan."
            else:
                msg = "No auto fix (local)"
        else:
            suggestions = []
            if port:
                suggestions.append(f"netsh advfirewall firewall add rule name=\"BLOCK_{port}\" dir=in action=block protocol=TCP localport={port}")
            if "DISK" in title:
                suggestions.append("Manual cleanup temp/recycle bin on remote")
            msg = f"REMOTE HOST: Manual fix needed → Commands: {'; '.join(suggestions)}"

    except Exception as e:
        msg = f"FAILED: Run as Administrator → {str(e)[:50]}"

    update_event.set()
    background_tasks.add_task(perform_audit)
    return {"message": msg}

@app.post("/discover")
async def start_discovery(data: dict):
    found = discover_assets(data.get("range", "192.168.1.1/24"))
    LATEST_REPORT["assets"] = found
    return {"status": "success", "devices": found}

@app.get("/download-report")
async def download_report():
    try:
        filename = generate_pdf_report(LATEST_REPORT)
        return FileResponse(filename, media_type='application/pdf', filename="TECHIFY_Compliance_Report.pdf")
    except Exception as e:
        return {"error": f"Report generation failed: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)