from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.file import EncryptedFileInfo
from app.services.upload_service import upload_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/files", tags=["File Management"])


@router.get("", response_model=List[EncryptedFileInfo])
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = upload_service.list_user_files(db=db, user_id=current_user.id)
    return [
        EncryptedFileInfo(
            id=f.id,
            owner_id=f.owner_id,
            chunk_count=f.chunk_count,
            iv_prefix=f.iv_prefix,
            crypto_version=f.crypto_version,
            status=f.status,
            ciphertext_size=f.ciphertext_size,
            created_at=f.created_at,
            active_shares_count=len([s for s in f.shares if s.status == "ACTIVE"])
        )
        for f in files
    ]


@router.get("/{id}", response_model=EncryptedFileInfo)
def get_file(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    f = upload_service.get_user_file(db=db, file_id=id, user_id=current_user.id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return EncryptedFileInfo(
        id=f.id,
        owner_id=f.owner_id,
        chunk_count=f.chunk_count,
        iv_prefix=f.iv_prefix,
        crypto_version=f.crypto_version,
        status=f.status,
        ciphertext_size=f.ciphertext_size,
        created_at=f.created_at,
        active_shares_count=len([s for s in f.shares if s.status == "ACTIVE"])
    )


@router.delete("/{id}")
def delete_file(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    success = upload_service.delete_file(
        db=db,
        file_id=id,
        user_id=current_user.id,
        ip_address=client_ip
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found or unauthorized")

    return {"message": "File and ciphertext storage deleted successfully"}
