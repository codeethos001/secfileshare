from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.share import CreateShareRequest, ShareResponse, PublicShareInfo, StartDownloadSessionResponse
from app.services.sharing_service import sharing_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(tags=["Sharing & Public Access"])


@router.post("/files/{id}/share", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
def create_share(
    id: str,
    req: CreateShareRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    recipient_id = None
    if req.share_type == "RECIPIENT" and req.recipient_email:
        recipient = db.query(User).filter(User.email == req.recipient_email.lower().strip()).first()
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient user not found")
        recipient_id = recipient.id

    try:
        share = sharing_service.create_share(
            db=db,
            file_id=id,
            user_id=current_user.id,
            share_type=req.share_type,
            expiry_hours=req.expiry_hours,
            max_downloads=req.max_downloads,
            recipient_id=recipient_id,
            encapsulated_key=req.encapsulated_key,
            encrypted_key=req.encrypted_key,
            ip_address=client_ip
        )
        return ShareResponse.model_validate(share)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/shares", response_model=List[ShareResponse])
def list_shares(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    shares = sharing_service.list_user_shares(db=db, user_id=current_user.id)
    return [ShareResponse.model_validate(s) for s in shares]


@router.delete("/shares/{id}")
def revoke_share(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    success = sharing_service.revoke_share(
        db=db,
        share_id=id,
        user_id=current_user.id,
        ip_address=client_ip
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found or unauthorized")

    return {"message": "Share link successfully revoked"}


# --- Public Access Endpoints ---

@router.get("/public/shares/{id}", response_model=PublicShareInfo)
def get_public_share(id: str, db: Session = Depends(get_db)):
    try:
        share, file = sharing_service.get_public_share(db=db, share_id=id)
        return PublicShareInfo(
            share_id=share.id,
            chunk_count=file.chunk_count,
            iv_prefix=file.iv_prefix,
            crypto_version=file.crypto_version,
            ciphertext_size=file.ciphertext_size,
            is_expired=(share.status == "EXPIRED"),
            is_limit_reached=(share.max_downloads is not None and share.download_count >= share.max_downloads),
            status=share.status,
            created_at=share.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/public/shares/{id}/download-sessions", response_model=StartDownloadSessionResponse)
def start_download_session(id: str, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    try:
        token, file, expires_at = sharing_service.start_download_session(
            db=db,
            share_id=id,
            ip_address=client_ip
        )
        return StartDownloadSessionResponse(
            download_session_token=token,
            chunk_count=file.chunk_count,
            iv_prefix=file.iv_prefix,
            crypto_version=file.crypto_version,
            ciphertext_size=file.ciphertext_size,
            expires_at=expires_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/public/download-sessions/{id}/chunks/{index}")
async def get_download_chunk(id: str, index: int, db: Session = Depends(get_db)):
    try:
        ciphertext = await sharing_service.get_chunk_for_session(
            db=db,
            raw_token=id,
            chunk_index=index
        )
        return Response(
            content=ciphertext,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="chunk_{index}.bin"'}
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found")
