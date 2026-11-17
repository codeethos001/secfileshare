from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.file import EncryptedFile
from app.models.file_chunk import FileChunk
from app.models.share import Share
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service


class UploadService:
    @staticmethod
    def init_upload(
        db: Session,
        owner_id: str,
        chunk_count: int,
        iv_prefix: str,
        crypto_version: str,
        total_ciphertext_size: int,
        ip_address: Optional[str] = None
    ) -> EncryptedFile:
        file = EncryptedFile(
            owner_id=owner_id,
            chunk_count=chunk_count,
            iv_prefix=iv_prefix,
            crypto_version=crypto_version,
            status="UPLOADING",
            ciphertext_size=total_ciphertext_size
        )
        db.add(file)
        db.commit()
        db.refresh(file)

        audit_service.log_event(
            db=db,
            event_type="FILE_UPLOAD_INIT",
            user_id=owner_id,
            ip_address=ip_address,
            metadata={
                "file_id": file.id,
                "chunk_count": chunk_count,
                "ciphertext_size": total_ciphertext_size
            }
        )
        return file

    @staticmethod
    async def store_chunk(
        db: Session,
        file_id: str,
        user_id: str,
        chunk_index: int,
        ciphertext: bytes
    ) -> FileChunk:
        file = db.query(EncryptedFile).filter(
            EncryptedFile.id == file_id,
            EncryptedFile.owner_id == user_id
        ).first()

        if not file:
            raise ValueError("File not found or access denied")

        if chunk_index < 0 or chunk_index >= file.chunk_count:
            raise ValueError(f"Chunk index {chunk_index} out of bounds (total: {file.chunk_count})")

        # Check if chunk already uploaded (for idempotent resume / retries)
        existing_chunk = db.query(FileChunk).filter(
            FileChunk.file_id == file_id,
            FileChunk.chunk_index == chunk_index
        ).first()

        if existing_chunk:
            return existing_chunk

        # Save ciphertext chunk to disk
        storage_key, size = await storage_service.save_chunk(ciphertext)

        chunk = FileChunk(
            file_id=file_id,
            chunk_index=chunk_index,
            storage_key=storage_key,
            ciphertext_size=size
        )
        db.add(chunk)
        db.commit()
        db.refresh(chunk)
        return chunk

    @staticmethod
    def complete_upload(
        db: Session,
        file_id: str,
        user_id: str,
        ip_address: Optional[str] = None
    ) -> EncryptedFile:
        file = db.query(EncryptedFile).filter(
            EncryptedFile.id == file_id,
            EncryptedFile.owner_id == user_id
        ).first()

        if not file:
            raise ValueError("File not found or access denied")

        # Validate that all expected chunks are present
        uploaded_chunks = db.query(FileChunk.chunk_index).filter(
            FileChunk.file_id == file_id
        ).all()
        indices = {c[0] for c in uploaded_chunks}

        expected_indices = set(range(file.chunk_count))
        missing = expected_indices - indices
        if missing:
            raise ValueError(f"Incomplete upload: missing chunks {sorted(list(missing))[:10]}")

        file.status = "COMPLETED"
        db.commit()
        db.refresh(file)

        audit_service.log_event(
            db=db,
            event_type="FILE_UPLOAD_COMPLETE",
            user_id=user_id,
            ip_address=ip_address,
            metadata={"file_id": file.id, "chunk_count": file.chunk_count}
        )
        return file

    @staticmethod
    def list_user_files(db: Session, user_id: str) -> list[EncryptedFile]:
        return db.query(EncryptedFile).filter(
            EncryptedFile.owner_id == user_id,
            EncryptedFile.status != "DELETED"
        ).order_by(EncryptedFile.created_at.desc()).all()

    @staticmethod
    def get_user_file(db: Session, file_id: str, user_id: str) -> Optional[EncryptedFile]:
        return db.query(EncryptedFile).filter(
            EncryptedFile.id == file_id,
            EncryptedFile.owner_id == user_id,
            EncryptedFile.status != "DELETED"
        ).first()

    @staticmethod
    def delete_file(db: Session, file_id: str, user_id: str, ip_address: Optional[str] = None) -> bool:
        file = db.query(EncryptedFile).filter(
            EncryptedFile.id == file_id,
            EncryptedFile.owner_id == user_id
        ).first()

        if not file:
            return False

        # Delete chunks from storage
        chunks = db.query(FileChunk).filter(FileChunk.file_id == file.id).all()
        for chunk in chunks:
            storage_service.delete_chunk(chunk.storage_key)

        db.delete(file)
        db.commit()

        audit_service.log_event(
            db=db,
            event_type="FILE_DELETED",
            user_id=user_id,
            ip_address=ip_address,
            metadata={"file_id": file_id}
        )
        return True


upload_service = UploadService()
