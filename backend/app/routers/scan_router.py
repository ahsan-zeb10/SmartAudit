from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.deps import require_role, log_action, get_db

router = APIRouter(tags=["Scan"])

@router.post("/scan")
def run_scan(data: dict, request: Request,
             db: Session = Depends(get_db),
             user=Depends(require_role(["admin", "analyst"]))):
    log_action(db, user, "SCAN_STARTED", resource=data.get("host"), request=request)
    return {"message": "Scan started", "host": data.get("host")}

@router.post("/discover")
def discover(data: dict, request: Request,
             db: Session = Depends(get_db),
             user=Depends(require_role(["admin", "analyst"]))):
    log_action(db, user, "DISCOVERY_RUN", resource=data.get("range"), request=request)
    return {"message": "Discovery started"}