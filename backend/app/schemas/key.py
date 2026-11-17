from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RegisterKeyRequest(BaseModel):
    public_key: str = Field(..., min_length=10)
    encrypted_private_key: str = Field(..., min_length=10)
    salt: str = Field(..., min_length=8)
    nonce: str = Field(..., min_length=8)
    key_version: int = 1


class UserKeyResponse(BaseModel):
    user_id: str
    public_key: str
    encrypted_private_key: str
    salt: str
    nonce: str
    key_version: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicUserKeyResponse(BaseModel):
    user_id: str
    user_name: str
    public_key: str
    key_version: int
