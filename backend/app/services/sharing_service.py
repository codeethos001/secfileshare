from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.share import Share
from app.models.file import EncryptedFile
from app.models.file_chunk import FileChunk
from app.models.key_envelope import KeyEnvelope
from app.models.download_session import DownloadSession
from app.core.security import generate_secure_token, hash_token
from app.core.config import settings
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service


class SharingService:
    @staticmethod
    def create_share(
        db: Session,
        file_id: str,
        user_id: str,
        share_type: str = "LINK",
        expiry_hours: Optional[int] = 24,
        max_downloads: Optional[int] = None,
        recipient_id: Optional[str] = None,
        encapsulated_key: Optional[str] = None,
        encrypted_key: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Share:
        file = db.query(EncryptedFile).filter(
            EncryptedFile.id == file_id,
            EncryptedFile.owner_id == user_id,
            EncryptedFile.status == "COMPLETED"
        ).first()

        if not file:
            raise ValueError("File not found or upload has not completed yet")

        expiry = datetime.now(timezone.utc) + timedelta(hours=expiry_hours) if expiry_hours else None
        share_id = generate_secure_token(prefix="sh_")

        share = Share(
            id=share_id,
            file_id=file.id,
            owner_id=user_id,
            share_type=share_type,
            expiry=expiry,
            max_downloads=max_downloads,
            download_count=0,
            status="ACTIVE"
        )
        db.add(share)

        if share_type == "RECIPIENT" and recipient_id and encapsulated_key and encrypted_key:
            envelope = KeyEnvelope(
                file_id=file.id,
                recipient_id=recipient_id,
                encapsulated_key=encapsulated_key,
                encrypted_key=encrypted_key
            )
            db.add(envelope)

        db.commit()
        db.refresh(share)

        audit_service.log_event(
            db=db,
            event_type="SHARE_CREATED",
            user_id=user_id,
            ip_address=ip_address,
            metadata={
                "share_id": share.id,
                "file_id": file.id,
                "share_type": share_type,
                "max_downloads": max_downloads,
                "expiry": expiry.isoformat() if expiry else None
            }
        )
        return share

    @staticmethod
    def list_user_shares(db: Session, user_id: str) -> list[Share]:
        now = datetime.now(timezone.utc)
        shares = db.query(Share).filter(Share.owner_id == user_id).order_by(Share.created_at.desc()).all()
        for s in shares:
            if s.status == "ACTIVE":
                if s.expiry and s.expiry <= now:
                    s.status = "EXPIRED"
                elif s.max_downloads and s.download_count >= s.max_downloads:
                    s.status = "EXPIRED"
        db.commit()
        return shares

    @staticmethod
    def revoke_share(db: Session, share_id: str, user_id: str, ip_address: Optional[str] = None) -> bool:
        share = db.query(Share).filter(Share.id == share_id, Share.owner_id == user_id).first()
        if not share:
            return False

        share.status = "REVOKED"
        db.commit()

        audit_service.log_event(
            db=db,
            event_type="SHARE_REVOKED",
            user_id=user_id,
            ip_address=ip_address,
            metadata={"share_id": share_id}
        )
        return True

    @staticmethod
    def get_public_share(db: Session, share_id: str) -> tuple[Share, EncryptedFile]:
        share = db.query(Share).filter(Share.id == share_id).first()
        if not share:
            raise ValueError("Share not found")

        now = datetime.now(timezone.utc)
        if share.status == "REVOKED":
            raise ValueError("This share link has been revoked by the owner")

        if share.expiry and share.expiry <= now:
            share.status = "EXPIRED"
            db.commit()
            raise ValueError("This share link has expired")

        if share.max_downloads and share.download_count >= share.max_downloads:
            share.status = "EXPIRED"
            db.commit()
            raise ValueError("Maximum download limit reached for this share")

        file = db.query(EncryptedFile).filter(
            EncryptedFile.id == share.file_id,
            EncryptedFile.status == "COMPLETED"
        ).first()

        if not file:
            raise ValueError("Shared file is no longer available")

        return share, file

    @staticmethod
    def start_download_session(db: Session, share_id: str, ip_address: Optional[str] = None) -> tuple[str, EncryptedFile, datetime]:
        share, file = SharingService.get_public_share(db, share_id)

        # Count session once when created
        share.download_count += 1
        if share.max_downloads and share.download_count >= share.max_downloads:
            share.status = "EXPIRED"

        raw_token = generate_secure_token(prefix="ds_tok_")
        t_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.DOWNLOAD_SESSION_EXPIRE_MINUTES)

        download_session = DownloadSession(
            share_id=share.id,
            token_hash=t_hash,
            expires_at=expires_at
        )
        db.add(download_session)
        db.commit()

        audit_service.log_event(
            db=db,
            event_type="DOWNLOAD_SESSION_STARTED",
            user_id=share.owner_id,
            ip_address=ip_address,
            metadata={
                "share_id": share.id,
                "file_id": file.id,
                "download_count": share.download_count
            }
        )
        return raw_token, file, expires_at

    @staticmethod
    async def get_chunk_for_session(db: Session, raw_token: str, chunk_index: int) -> bytes:
        t_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)

        session = db.query(DownloadSession).filter(
            DownloadSession.token_hash == t_hash,
            DownloadSession.expires_at > now
        ).first()

        if not session:
            raise ValueError("Invalid or expired download session")

        share = db.query(Share).filter(Share.id == session.share_id).first()
        if not share or share.status == "REVOKED":
            raise ValueError("Share access is revoked or unavailable")

        file = db.query(EncryptedFile).filter(EncryptedFile.id == share.file_id).first()
        if not file:
            raise ValueError("File not found")

        chunk = db.query(FileChunk).filter(
            FileChunk.file_id == file.id,
            FileChunk.chunk_index == chunk_index
        ).first()

        if not chunk:
            raise ValueError(f"Chunk {chunk_index} not found")

        return await storage_service.get_chunk(chunk.storage_key)


sharing_service = SharingService()
