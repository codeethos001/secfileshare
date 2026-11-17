import hashlib
import secrets
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Initialize Argon2id password hasher with secure parameters (RFC 9106)
# Type: Argon2id (default in argon2-cffi PasswordHasher)
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def generate_secure_token(prefix: str = "ss_") -> str:
    """Generate a high-entropy cryptographically secure random token."""
    return f"{prefix}{secrets.token_urlsafe(32)}"


def hash_token(token: str) -> str:
    """Hash a token using SHA-256 for persistent database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def compute_audit_hash(prev_hash: str | None, event_type: str, user_id: str | None, timestamp: str, metadata: str) -> str:
    """Compute tamper-evident SHA-256 hash chaining audit events."""
    record = f"{prev_hash or 'GENESIS'}:{event_type}:{user_id or 'ANON'}:{timestamp}:{metadata}"
    return hashlib.sha256(record.encode("utf-8")).hexdigest()
