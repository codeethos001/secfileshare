import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base, utc_now


class UserKey(Base):
    __tablename__ = "user_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    public_key = Column(Text, nullable=False)  # Base64-encoded HPKE X25519 public key
    encrypted_private_key = Column(Text, nullable=False)  # Encrypted private key blob
    salt = Column(String(64), nullable=False)  # Salt for passphrase derivation
    nonce = Column(String(32), nullable=False)  # IV/Nonce for private key encryption
    key_version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="keys")
