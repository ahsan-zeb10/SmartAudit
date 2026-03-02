from fastapi import APIRouter, Depends
from app.deps import require_role

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard")
def view_dashboard(user=Depends(require_role(["admin", "analyst", "viewer"]))):
    return {"message": "Dashboard data", "role": user.role.value}