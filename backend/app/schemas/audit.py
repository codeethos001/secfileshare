from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    id: str
    user_id: Optional[str]
    event_type: str
    ip_address: Optional[str]
    timestamp: datetime
    metadata_json: str
    prev_hash: Optional[str]

    model_config = ConfigDict(from_attributes=True)
