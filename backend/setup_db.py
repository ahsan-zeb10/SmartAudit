import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal
from app.models import Base, User, RoleEnum
from app.auth import hash_password

Base.metadata.create_all(bind=engine)
print("Tables created.")

db = SessionLocal()

users_to_create = [
    ("admin@techify.local",   "admin",   "Admin@123",   RoleEnum.admin,   "Administrator"),
    ("analyst@techify.local", "analyst", "Analyst@123", RoleEnum.analyst, "Security Analyst"),
    ("viewer@techify.local",  "viewer",  "Viewer@123",  RoleEnum.viewer,  "Viewer"),
]

for em ail, username, password, role, name in users_to_create:
    if not db.query(User).filter(User.username == username).first():
        db.add(User(
            email=email,
            username=username,
            hashed_pw=hash_password(password),
            role=role,
            full_name=name,
            is_active=True,
        ))
        db.commit()
        print("Created: " + username + " / " + password)
    else:
        print("Exists:  " + username)

db.close()
print("Done! Run: uvicorn main:app --reload")