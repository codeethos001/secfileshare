from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CreateShareRequest(BaseModel):
    share_type: str = Field(default="LINK", pattern="^(LINK|RECIPIENT)$")
    expiry_hours: Optional[int] = Field(default=24, ge=1, le=8760)  # Up to 1 year
    max_downloads: Optional[int] = Field(default=None, ge=1, le=1000)
    recipient_email: Optional[str] = None
    encapsulated_key: Optional[str] = None
    encrypted_key: Optional[str] = None


class ShareResponse(BaseModel):
    id: str
    file_id: str
    owner_id: str
    share_type: str
    expiry: Optional[datetime] = None
    max_downloads: Optional[int] = None
    download_count: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicShareInfo(BaseModel):
    share_id: str
    chunk_count: int
    iv_prefix: str
    crypto_version: str
    ciphertext_size: int
    is_expired: bool
    is_limit_reached: bool
    status: str
    created_at: datetime


class StartDownloadSessionResponse(BaseModel):
    download_session_token: str
    chunk_count: int
    iv_prefix: str
    crypto_version: str
    ciphertext_size: int
    expires_at: datetime
