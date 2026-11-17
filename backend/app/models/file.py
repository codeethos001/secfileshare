import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base, utc_now


class EncryptedFile(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    chunk_count = Column(Integer, nullable=False)
    iv_prefix = Column(String(32), nullable=False)  # 8-byte random IV prefix (hex/base64)
    crypto_version = Column(String(16), default="v1.0-aes256gcm", nullable=False)
    status = Column(String(20), default="INITIALIZING", nullable=False)  # INITIALIZING, UPLOADING, COMPLETED, DELETED
    ciphertext_size = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    owner = relationship("User", back_populates="files")
    chunks = relationship("FileChunk", back_populates="file", cascade="all, delete-orphan", order_by="FileChunk.chunk_index")
    shares = relationship("Share", back_populates="file", cascade="all, delete-orphan")
    key_envelopes = relationship("KeyEnvelope", back_populates="file", cascade="all, delete-orphan")
