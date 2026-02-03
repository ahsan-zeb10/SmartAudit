from fastapi import FastAPI
from scanner import ServerAuditor
from pydantic import BaseModel

app = FastAPI()

class ServerCredentials(BaseModel):
    host: str
    username: str
    password: str

@app.get("/")
def home():
    return {"message": "AI Governance MVP Backend is Running"}

@app.post("/scan")
def scan_server(creds: ServerCredentials):
    # Auditor ko call karna
    auditor = ServerAuditor(creds.host, creds.username, creds.password)
    report = auditor.run_audit()
    
    # Yahan hum bad mein GenAI add karenge jo is report ko summarize karegi
    return {
        "server": creds.host,
        "audit_report": report
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)