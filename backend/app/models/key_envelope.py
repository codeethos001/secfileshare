import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base, utc_now


class KeyEnvelope(Base):
    __tablename__ = "key_envelopes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), index=True, nullable=False)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    encapsulated_key = Column(Text, nullable=False)  # HPKE encapsulated ephemeral key
    encrypted_key = Column(Text, nullable=False)     # HPKE encrypted AES file key
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("file_id", "recipient_id", name="uq_file_recipient_envelope"),
    )

    file = relationship("EncryptedFile", back_populates="key_envelopes")
    recipient = relationship("User", back_populates="received_envelopes")
