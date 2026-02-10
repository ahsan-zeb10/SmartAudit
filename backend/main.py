from fastapi import FastAPI
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uvicorn

# Apni files se functions import kar rahe hain
from scanner import ServerAuditor
from ai_engine import get_ai_summary
from database import init_db, save_audit_result


@asynccontextmanager
async def lifespan(app: FastAPI):
    # App start hote hi Database initialize hoga
    print("🚀 Starting Smart Audit Backend...")
    try:
        init_db()
    except Exception as e:
        print(f"❌ Startup Error: {e}")
    yield
    # App band hote waqt agar kuch karna ho (Optional)
    print("🛑 Shutting down Smart Audit Backend...")

# FastAPI Initialization
app = FastAPI(
    title="Smart Audit API",
    description="AI-Powered Infrastructure Governance Platform",
    lifespan=lifespan
)

# Request Model
class ServerCredentials(BaseModel):
    host: str
    username: str
    password: str



@app.get("/")
def home():
    return {"message": "Welcome to Smart Audit API", "status": "Running"}

@app.post("/scan")
def scan_server(creds: ServerCredentials):
    print(f"🔍 Scanning server: {creds.host}...")
    
    # 1. SSH Scanner chalaein
    auditor = ServerAuditor(creds.host, creds.username, creds.password)
    report = auditor.run_audit()
    
    # 2. AI se formal summary lein
    ai_insight = "No violations found. System is secure."
    if report["violations"]:
        print("🧠 Generating AI Analysis...")
        ai_insight = get_ai_summary(report["violations"])
    
    # 3. Database mein result save karein (Milestone 2)
    if report["status"] != "Error":
        save_audit_result(
            host=creds.host, 
            violations=report["violations"], 
            ai_text=ai_insight
        )
    
    return {
        "status": "Audit Completed",
        "server": creds.host,
        "violations_found": len(report["violations"]),
        "audit_report": report,
        "ai_analysis": ai_insight,
        "db_status": "Saved to smartaudit_db"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)