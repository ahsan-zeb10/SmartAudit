from fastapi import FastAPI, BackgroundTasks, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import asyncio, uvicorn, os, subprocess, shutil, psutil, time
from sqlalchemy.orm import Session

from scanner import run_security_audit, discover_assets
from openvas_engine import run_combined_scan, run_openvas_scan, check_openvas_status
from ai_engine import get_ai_summary
from database import init_db
from report_gen import generate_pdf_report

from app.routers import auth_router, scan_router, device_router, dashboard_router
from app.deps import require_role, require_min_role, log_action, get_db
from app.models import User

app = FastAPI(title="Techify Smart Audit Platform", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(scan_router.router)
app.include_router(device_router.router)
app.include_router(dashboard_router.router)

all_devices_results = {}
CURRENT_TARGET      = {"host": "127.0.0.1"}
update_event        = asyncio.Event()
scan_progress       = {}

OPENVAS_CONFIG = {
    "enabled":     False,
    "host":        "127.0.0.1",
    "port":        9390,
    "username":    "admin",
    "password":    "ahsan.123",
    "scan_config": "Full and fast",
    "scan_mode":   "combined",
}

def calculate_score(violations):
    score = 100
    for v in violations:
        score -= {"Critical": 20, "High": 15, "Medium": 10, "Low": 5}.get(
            v.get("severity", "Low"), 5)
    return max(0, score)

async def perform_audit(host=None):
    target = host or CURRENT_TARGET["host"]
    scan_progress[target] = {
        "progress": 5,
        "status":   "Running",
        "engine":   "OpenVAS+Nmap" if OPENVAS_CONFIG["enabled"] else "Nmap",
    }
    try:
        loop    = asyncio.get_event_loop()
        mode    = OPENVAS_CONFIG.get("scan_mode", "nmap_only")
        enabled = OPENVAS_CONFIG.get("enabled", False)

        if enabled and mode == "combined":
            violations = await loop.run_in_executor(
                None, run_combined_scan, target, OPENVAS_CONFIG)
        elif enabled and mode == "openvas_only":
            violations = await loop.run_in_executor(
                None, run_openvas_scan, target,
                OPENVAS_CONFIG["host"], OPENVAS_CONFIG["port"],
                OPENVAS_CONFIG["username"], OPENVAS_CONFIG["password"],
                OPENVAS_CONFIG["scan_config"],
            )
        else:
            violations = await loop.run_in_executor(
                None, run_security_audit, target)

        engine_used = (
            "OpenVAS+Nmap" if (enabled and mode == "combined")
            else "OpenVAS" if enabled
            else "Nmap"
        )
        result = {
            "host":             target,
            "violations":       violations,
            "ai_analysis":      get_ai_summary(violations),
            "compliance_score": calculate_score(violations),
            "timestamp":        time.strftime("%Y-%m-%d %H:%M:%S"),
            "scan_engine":      engine_used,
        }
        all_devices_results[target] = result
        scan_progress[target] = {"progress": 100, "status": "Done", "engine": engine_used}
        return result
    except Exception as e:
        scan_progress[target] = {
            "progress": 0, "status": "Error", "engine": "", "error": str(e)}
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
async def get_audit(
    host: str = Query(default=None),
    user: User = Depends(require_min_role("viewer")),
):
    target = host or CURRENT_TARGET["host"]
    if target in all_devices_results:
        return all_devices_results[target]
    return await perform_audit(target) or {
        "host": target, "violations": [],
        "compliance_score": 100, "ai_analysis": "",
        "timestamp": "", "scan_engine": "Nmap",
    }

@app.get("/all-devices-audit")
async def all_audits(user: User = Depends(require_min_role("viewer"))):
    return all_devices_results

@app.get("/scan-progress/{host}")
async def get_scan_progress(
    host: str,
    user: User = Depends(require_min_role("viewer")),
):
    return scan_progress.get(host, {"progress": 0, "status": "Idle", "engine": ""})

@app.post("/scan")
async def start_scan(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User  = Depends(require_min_role("analyst")),
    db: Session = Depends(get_db),
):
    host = data.get("host", "127.0.0.1")
    CURRENT_TARGET["host"] = host
    update_event.set()
    background_tasks.add_task(perform_audit, host)
    log_action(db, user, "SCAN_STARTED", resource=host)
    return {
        "message": "Scan started for " + host,
        "engine":  "OpenVAS+Nmap" if OPENVAS_CONFIG["enabled"] else "Nmap",
    }

@app.post("/discover")
async def start_discovery(
    data: dict,
    user: User  = Depends(require_min_role("analyst")),
    db: Session = Depends(get_db),
):
    found = discover_assets(data.get("range", "192.168.1.0/24"))
    for device in found:
        await perform_audit(device.get("ip"))
    log_action(db, user, "DISCOVERY_RUN", resource=data.get("range"))
    return {"devices": found, "all_results": all_devices_results}

@app.post("/remediate")
async def remediate(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User  = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    violation = data.get("violation", {})
    host      = data.get("host", "127.0.0.1")
    port      = violation.get("port")
    title     = violation.get("title", "").upper()
    actions   = []
    if host in ["127.0.0.1", "localhost"]:
        if "DISK" in title:
            shutil.rmtree(os.path.expandvars("%TEMP%"), ignore_errors=True)
            actions.append("Temp files cleaned")
        if port:
            subprocess.run(
                "netsh advfirewall firewall add rule name=TECHIFY_BLOCK_"
                + str(port) + " dir=in action=block protocol=TCP localport=" + str(port),
                shell=True, capture_output=True,
            )
            actions.append("Port " + str(port) + " blocked")
    log_action(db, user, "REMEDIATION_APPLIED", resource=host,
               detail=str(violation.get("title")) + " => " + ", ".join(actions))
    update_event.set()
    return {"message": "Applied: " + (", ".join(actions) if actions else "No auto-fix available")}

@app.get("/live-stats/{host}")
async def live_stats(host: str, user: User = Depends(require_min_role("viewer"))):
    return {
        "cpu_percent":  psutil.cpu_percent(interval=0.1),
        "ram_percent":  psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage("/").percent,
    }

@app.get("/download-report")
async def download_report(
    host: str   = Query(...),
    user: User  = Depends(require_min_role("analyst")),
    db: Session = Depends(get_db),
):
    report = all_devices_results.get(host)
    if not report:
        return {"error": "No scan data. Run audit first."}
    log_action(db, user, "REPORT_DOWNLOADED", resource=host)
    pdf_path = generate_pdf_report(report)
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename="TECHIFY_" + host.replace(".", "_") + ".pdf")

@app.get("/openvas/status")
async def openvas_status(user: User = Depends(require_min_role("analyst"))):
    s = check_openvas_status(OPENVAS_CONFIG["host"], OPENVAS_CONFIG["port"])
    return {**s, "config": {k: v for k, v in OPENVAS_CONFIG.items() if k != "password"}}

@app.post("/openvas/configure")
async def openvas_configure(
    data: dict,
    user: User  = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    global OPENVAS_CONFIG
    for k in ["enabled", "host", "port", "username", "password", "scan_config", "scan_mode"]:
        if k in data:
            OPENVAS_CONFIG[k] = data[k]
    if data.get("enabled"):
        s = check_openvas_status(OPENVAS_CONFIG["host"], OPENVAS_CONFIG["port"])
        if not s["running"]:
            OPENVAS_CONFIG["enabled"] = False
            return {"success": False, "error": s["message"],
                    "hint": "Run: docker start openvas"}
    log_action(db, user, "OPENVAS_CONFIG_CHANGED")
    return {"success": True, "config": {k: v for k, v in OPENVAS_CONFIG.items() if k != "password"}}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)