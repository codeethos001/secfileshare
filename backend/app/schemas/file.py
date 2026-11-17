from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class UploadInitRequest(BaseModel):
    chunk_count: int = Field(..., ge=1, le=5000)
    iv_prefix: str = Field(..., min_length=8, max_length=64)
    crypto_version: str = Field(default="v1.0-aes256gcm", max_length=16)
    total_ciphertext_size: int = Field(..., ge=1)


class UploadInitResponse(BaseModel):
    file_id: str
    chunk_count: int
    status: str
    created_at: datetime


class ChunkUploadResponse(BaseModel):
    chunk_index: int
    ciphertext_size: int
    status: str


class CompleteUploadResponse(BaseModel):
    file_id: str
    status: str
    chunk_count: int
    ciphertext_size: int


class EncryptedFileInfo(BaseModel):
    id: str
    owner_id: str
    chunk_count: int
    iv_prefix: str
    crypto_version: str
    status: str
    ciphertext_size: int
    created_at: datetime
    active_shares_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
