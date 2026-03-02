from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.deps import require_role, log_action, get_db
from app.models import Device

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.post("")
def add_device(data: dict, request: Request,
               db: Session = Depends(get_db),
               user=Depends(require_role(["admin"]))):
    device = Device(
        name=data.get("name"),
        ip_address=data.get("ip"),
        added_by=user.id,
    )
    db.add(device)
    db.commit()
    log_action(db, user, "DEVICE_ADDED", resource=data.get("ip"), request=request)
    return {"message": "Device added"}

@router.get("")
def list_devices(db: Session = Depends(get_db),
                 user=Depends(require_role(["admin", "analyst"]))):
    devices = db.query(Device).all()
    return [{"id": d.id, "name": d.name, "ip": d.ip_address,
             "os": d.os_name, "type": d.device_type} for d in devices]

@router.delete("/{device_id}")
def delete_device(device_id: str, request: Request,
                  db: Session = Depends(get_db),
                  user=Depends(require_role(["admin"]))):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(404, "Device not found")
    db.delete(device)
    db.commit()
    log_action(db, user, "DEVICE_DELETED", resource=device_id, request=request)
    return {"message": "Device deleted"}