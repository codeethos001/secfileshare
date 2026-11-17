import json
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.audit_event import AuditEvent
from app.core.security import compute_audit_hash


class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        event_type: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditEvent:
        """Create a tamper-evident hash-linked audit record."""
        # Sanitize metadata: NEVER record keys, passwords, or plaintext filenames
        safe_meta = metadata.copy() if metadata else {}
        for sensitive_key in ["password", "key", "secret", "token", "filename"]:
            if sensitive_key in safe_meta:
                safe_meta[sensitive_key] = "[REDACTED]"

        meta_json = json.dumps(safe_meta, sort_keys=True)
        now = datetime.now(timezone.utc)

        # Retrieve last audit event to maintain hash chain
        last_event = db.query(AuditEvent).order_by(desc(AuditEvent.timestamp)).first()
        prev_hash = last_event.prev_hash if last_event else None

        current_hash = compute_audit_hash(
            prev_hash=prev_hash,
            event_type=event_type,
            user_id=user_id,
            timestamp=now.isoformat(),
            metadata=meta_json
        )

        audit_entry = AuditEvent(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            timestamp=now,
            metadata_json=meta_json,
            prev_hash=current_hash
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

    @staticmethod
    def list_events(db: Session, user_id: Optional[str] = None, limit: int = 50) -> list[AuditEvent]:
        query = db.query(AuditEvent)
        if user_id:
            query = query.filter(AuditEvent.user_id == user_id)
        return query.order_by(desc(AuditEvent.timestamp)).limit(limit).all()


audit_service = AuditService()
