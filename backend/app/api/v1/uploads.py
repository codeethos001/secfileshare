from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.file import UploadInitRequest, UploadInitResponse, ChunkUploadResponse, CompleteUploadResponse
from app.services.upload_service import upload_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["Encrypted Uploads"])


@router.post("", response_model=UploadInitResponse, status_code=status.HTTP_201_CREATED)
def init_upload(
    req: UploadInitRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    try:
        file = upload_service.init_upload(
            db=db,
            owner_id=current_user.id,
            chunk_count=req.chunk_count,
            iv_prefix=req.iv_prefix,
            crypto_version=req.crypto_version,
            total_ciphertext_size=req.total_ciphertext_size,
            ip_address=client_ip
        )
        return UploadInitResponse(
            file_id=file.id,
            chunk_count=file.chunk_count,
            status=file.status,
            created_at=file.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{id}/chunks/{index}", response_model=ChunkUploadResponse)
async def upload_chunk(
    id: str,
    index: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Read raw encrypted binary payload
    chunk_data = await request.body()
    if not chunk_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chunk body cannot be empty")

    try:
        chunk = await upload_service.store_chunk(
            db=db,
            file_id=id,
            user_id=current_user.id,
            chunk_index=index,
            ciphertext=chunk_data
        )
        return ChunkUploadResponse(
            chunk_index=chunk.chunk_index,
            ciphertext_size=chunk.ciphertext_size,
            status="STORED"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{id}/complete", response_model=CompleteUploadResponse)
def complete_upload(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    try:
        file = upload_service.complete_upload(
            db=db,
            file_id=id,
            user_id=current_user.id,
            ip_address=client_ip
        )
        return CompleteUploadResponse(
            file_id=file.id,
            status=file.status,
            chunk_count=file.chunk_count,
            ciphertext_size=file.ciphertext_size
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
