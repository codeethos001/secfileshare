from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.audit import AuditEventResponse
from app.services.audit_service import audit_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["Security Activity & Audit"])


@router.get("", response_model=List[AuditEventResponse])
def get_audit_trail(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = audit_service.list_events(db=db, user_id=current_user.id, limit=limit)
    return [AuditEventResponse.model_validate(e) for e in events]
