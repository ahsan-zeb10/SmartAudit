from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class RoleEnum(str, enum.Enum):
    admin   = "admin"
    analyst = "analyst"
    viewer  = "viewer"

ROLE_LEVELS = {
    RoleEnum.admin:   3,
    RoleEnum.analyst: 2,
    RoleEnum.viewer:  1,
}

class User(Base):
    __tablename__ = "users"
    id         = Column(String, primary_key=True, default=gen_uuid)
    email      = Column(String(200), unique=True, nullable=False)
    username   = Column(String(50),  unique=True, nullable=False)
    hashed_pw  = Column(String, nullable=False)
    role       = Column(Enum(RoleEnum), default=RoleEnum.viewer)
    full_name  = Column(String(100), nullable=True)
    is_active  = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    logs = relationship("AuditLog", back_populates="user", cascade="all, delete")

class Device(Base):
    __tablename__ = "devices"
    id          = Column(String, primary_key=True, default=gen_uuid)
    name        = Column(String(100), nullable=False)
    ip_address  = Column(String(45),  nullable=False)
    mac_address = Column(String(17),  nullable=True)
    os_name     = Column(String(100), nullable=True)
    device_type = Column(String(50),  nullable=True)
    added_by    = Column(String, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id         = Column(String, primary_key=True, default=gen_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    action     = Column(String(50),  nullable=False)
    resource   = Column(String(200), nullable=True)
    detail     = Column(Text, nullable=True)
    ip_addr    = Column(String(45),  nullable=True)
    status     = Column(String(20),  default="success")
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="logs")