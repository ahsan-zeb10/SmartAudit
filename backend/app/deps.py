from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.config import SECRET_KEY, ALGORITHM
from app.database import get_db
from app.models import User, RoleEnum, ROLE_LEVELS, AuditLog

bearer = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(401, "Login required")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(403, "User not found or deactivated")
    return user

def require_role(allowed_roles: list):
    def checker(user=Depends(get_current_user)):
        if user.role.value not in allowed_roles:
            raise HTTPException(403, "Access denied. Your role: " + user.role.value)
        return user
    return checker

def require_min_role(min_role: str):
    min_level = ROLE_LEVELS.get(RoleEnum(min_role), 0)
    def checker(user=Depends(get_current_user)):
        if ROLE_LEVELS.get(user.role, 0) < min_level:
            raise HTTPException(403, "Minimum role required: " + min_role)
        return user
    return checker

def log_action(db, user, action, resource=None, detail=None, request=None):
    ip = None
    if request:
        fwd = request.headers.get("X-Forwarded-For")
        ip = fwd.split(",")[0] if fwd else (
            request.client.host if request.client else None)
    db.add(AuditLog(
        user_id=user.id,
        action=action.upper(),
        resource=resource,
        detail=detail,
        ip_addr=ip,
    ))
    try:
        db.commit()
    except Exception:
        db.rollback()