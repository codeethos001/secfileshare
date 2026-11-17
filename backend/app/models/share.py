import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base, utc_now


class Share(Base):
    __tablename__ = "shares"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), index=True, nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    share_type = Column(String(20), default="LINK", nullable=False)  # LINK, RECIPIENT
    expiry = Column(DateTime, nullable=True)
    max_downloads = Column(Integer, nullable=True)  # None = unlimited
    download_count = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, REVOKED, EXPIRED
    created_at = Column(DateTime, default=utc_now, nullable=False)

    file = relationship("EncryptedFile", back_populates="shares")
    owner = relationship("User", back_populates="shares")
    download_sessions = relationship("DownloadSession", back_populates="share", cascade="all, delete-orphan")
