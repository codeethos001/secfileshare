import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base, utc_now


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    event_type = Column(String(50), index=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    metadata_json = Column(Text, default="{}", nullable=False)
    prev_hash = Column(String(64), nullable=True)  # Cryptographic hash link to previous audit event

    user = relationship("User", back_populates="audit_events")
