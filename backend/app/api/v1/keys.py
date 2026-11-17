from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.key import RegisterKeyRequest, UserKeyResponse, PublicUserKeyResponse
from app.models.user import User
from app.models.user_key import UserKey
from app.models.key_envelope import KeyEnvelope
from app.core.dependencies import get_current_user

router = APIRouter(tags=["Keys & Hybrid Envelopes"])


@router.put("/keys/me", response_model=UserKeyResponse)
def register_keys(
    req: RegisterKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    key = db.query(UserKey).filter(UserKey.user_id == current_user.id).first()
    if key:
        key.public_key = req.public_key
        key.encrypted_private_key = req.encrypted_private_key
        key.salt = req.salt
        key.nonce = req.nonce
        key.key_version = req.key_version
    else:
        key = UserKey(
            user_id=current_user.id,
            public_key=req.public_key,
            encrypted_private_key=req.encrypted_private_key,
            salt=req.salt,
            nonce=req.nonce,
            key_version=req.key_version
        )
        db.add(key)

    db.commit()
    db.refresh(key)
    return UserKeyResponse.model_validate(key)


@router.get("/keys/me", response_model=UserKeyResponse)
def get_my_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    key = db.query(UserKey).filter(UserKey.user_id == current_user.id).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No keypair registered for user")
    return UserKeyResponse.model_validate(key)


@router.get("/users/{id}/public-key", response_model=PublicUserKeyResponse)
def get_user_public_key(id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    key = db.query(UserKey).filter(UserKey.user_id == user.id).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User has not published a public key")

    return PublicUserKeyResponse(
        user_id=user.id,
        user_name=user.name,
        public_key=key.public_key,
        key_version=key.key_version
    )


@router.get("/inbox")
def get_inbox(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    envelopes = db.query(KeyEnvelope).filter(KeyEnvelope.recipient_id == current_user.id).all()
    results = []
    for env in envelopes:
        file = env.file
        if file and file.status == "COMPLETED":
            results.append({
                "envelope_id": env.id,
                "file_id": file.id,
                "sender_id": file.owner_id,
                "sender_name": file.owner.name if file.owner else "Unknown",
                "chunk_count": file.chunk_count,
                "iv_prefix": file.iv_prefix,
                "ciphertext_size": file.ciphertext_size,
                "encapsulated_key": env.encapsulated_key,
                "encrypted_key": env.encrypted_key,
                "created_at": env.created_at
            })
    return results
