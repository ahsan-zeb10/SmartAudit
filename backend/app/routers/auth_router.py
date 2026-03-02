from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.auth import hash_password, verify_password, create_access_token
from app.models import User, RoleEnum, AuditLog
from app.database import get_db
from app.deps import get_current_user, require_role, log_action

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    email:     str
    username:  str
    password:  str
    full_name: Optional[str] = None
    role:      str = "viewer"

class UpdateUserRequest(BaseModel):
    role:      Optional[str]  = None
    is_active: Optional[bool] = None

@router.post("/login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email    == body.username.lower()) |
        (User.username == body.username.lower())
    ).first()
    if not user or not verify_password(body.password, user.hashed_pw):
        raise HTTPException(401, "Incorrect username or password")
    if not user.is_active:
        raise HTTPException(403, "Account deactivated")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token({"sub": user.id, "role": user.role.value})
    log_action(db, user, "LOGIN", request=request)
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":        user.id,
            "username":  user.username,
            "email":     user.email,
            "full_name": user.full_name,
            "role":      user.role.value,
        },
    }

@router.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "id":        user.id,
        "username":  user.username,
        "email":     user.email,
        "role":      user.role.value,
        "full_name": user.full_name,
        "is_active": user.is_active,
    }

@router.post("/register", status_code=201)
def register(body: RegisterRequest, request: Request,
             db: Session = Depends(get_db),
             actor=Depends(require_role(["admin"]))):
    if db.query(User).filter(
        (User.email == body.email) | (User.username == body.username)
    ).first():
        raise HTTPException(409, "Email or username already exists")
    try:
        role = RoleEnum(body.role)
    except ValueError:
        raise HTTPException(400, "Invalid role. Use: admin, analyst, viewer")
    user = User(
        email=body.email.lower(),
        username=body.username.lower(),
        hashed_pw=hash_password(body.password),
        role=role,
        full_name=body.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, actor, "USER_CREATED", resource=body.username, request=request)
    return {"message": "User created", "role": role.value}

@router.get("/users")
def list_users(db: Session = Depends(get_db),
               actor=Depends(require_role(["admin"]))):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id":         u.id,
            "username":   u.username,
            "email":      u.email,
            "role":       u.role.value,
            "is_active":  u.is_active,
            "last_login": u.last_login,
        }
        for u in users
    ]

@router.put("/users/{user_id}")
def update_user(user_id: str, body: UpdateUserRequest, request: Request,
                db: Session = Depends(get_db),
                actor=Depends(require_role(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == actor.id:
        raise HTTPException(400, "Cannot modify your own account")
    if body.role is not None:
        try:
            user.role = RoleEnum(body.role)
        except ValueError:
            raise HTTPException(400, "Invalid role")
    if body.is_active is not None:
        user.is_active = body.is_active
    db.commit()
    log_action(db, actor, "USER_UPDATED", resource=user_id, request=request)
    return {"message": "User updated"}

@router.get("/audit-logs")
def audit_logs(db: Session = Depends(get_db),
               actor=Depends(require_role(["admin"]))):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [
        {
            "action":   l.action,
            "user_id":  l.user_id,
            "resource": l.resource,
            "detail":   l.detail,
            "ip":       l.ip_addr,
            "time":     l.created_at,
        }
        for l in logs
    ]