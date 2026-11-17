from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.session import UserSession
from app.core.security import hash_password, verify_password, generate_secure_token, hash_token
from app.core.config import settings
from app.services.audit_service import audit_service


class AuthService:
    @staticmethod
    def register_user(db: Session, name: str, email: str, password: str, ip_address: Optional[str] = None) -> User:
        clean_email = email.lower().strip()
        existing = db.query(User).filter(User.email == clean_email).first()
        if existing:
            raise ValueError("An account with this email address already exists")

        pw_hash = hash_password(password)
        user = User(
            name=name.strip(),
            email=clean_email,
            password_hash=pw_hash,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        audit_service.log_event(
            db=db,
            event_type="USER_REGISTERED",
            user_id=user.id,
            ip_address=ip_address,
            metadata={"email": clean_email}
        )
        return user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str, ip_address: Optional[str] = None) -> tuple[User, str, datetime]:
        clean_email = email.lower().strip()
        user = db.query(User).filter(User.email == clean_email).first()
        if not user or not verify_password(password, user.password_hash):
            audit_service.log_event(
                db=db,
                event_type="AUTH_FAILED",
                user_id=user.id if user else None,
                ip_address=ip_address,
                metadata={"email": clean_email}
            )
            raise ValueError("Invalid email or password")

        if not user.is_active:
            raise ValueError("Account is deactivated")

        raw_token = generate_secure_token(prefix="ss_sess_")
        t_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)

        session = UserSession(
            user_id=user.id,
            token_hash=t_hash,
            expires_at=expires_at
        )
        db.add(session)
        db.commit()

        audit_service.log_event(
            db=db,
            event_type="USER_LOGIN",
            user_id=user.id,
            ip_address=ip_address,
            metadata={"session_expires": expires_at.isoformat()}
        )
        return user, raw_token, expires_at

    @staticmethod
    def validate_session(db: Session, raw_token: str) -> Optional[User]:
        t_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)
        session = db.query(UserSession).filter(
            UserSession.token_hash == t_hash,
            UserSession.expires_at > now
        ).first()

        if not session:
            return None

        user = db.query(User).filter(User.id == session.user_id, User.is_active == True).first()
        return user

    @staticmethod
    def revoke_session(db: Session, raw_token: str) -> bool:
        t_hash = hash_token(raw_token)
        session = db.query(UserSession).filter(UserSession.token_hash == t_hash).first()
        if session:
            user_id = session.user_id
            db.delete(session)
            db.commit()
            audit_service.log_event(
                db=db,
                event_type="USER_LOGOUT",
                user_id=user_id
            )
            return True
        return False


auth_service = AuthService()
