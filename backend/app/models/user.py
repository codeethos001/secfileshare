import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base, utc_now


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    keys = relationship("UserKey", back_populates="user", uselist=False, cascade="all, delete-orphan")
    files = relationship("EncryptedFile", back_populates="owner", cascade="all, delete-orphan")
    shares = relationship("Share", back_populates="owner", cascade="all, delete-orphan")
    received_envelopes = relationship("KeyEnvelope", back_populates="recipient", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="user")
