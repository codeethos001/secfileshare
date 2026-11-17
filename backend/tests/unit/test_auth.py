import pytest
from app.core.security import hash_password, verify_password, generate_secure_token, hash_token


def test_password_hashing():
    pw = "SuperSecurePassword123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_secure_tokens():
    t1 = generate_secure_token()
    t2 = generate_secure_token()
    assert t1 != t2
    assert t1.startswith("ss_")

    h1 = hash_token(t1)
    h2 = hash_token(t2)
    assert len(h1) == 64  # SHA-256 hex string
    assert h1 != h2
