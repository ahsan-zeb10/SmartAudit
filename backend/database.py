from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

DATABASE_URL = "postgresql://postgres:ahsan.123@localhost:5432/smartaudit_db"

Base = declarative_base()

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True)
    mac_address = Column(String)
    hostname = Column(String)
    status = Column(String)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

class Violation(Base):
    __tablename__ = "violations"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    policy_name = Column(String)
    details = Column(Text)
    ai_remediation = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database Tables Initialized in smartaudit_db")