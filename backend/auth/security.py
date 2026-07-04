"""
JWT + password hashing helpers.

Design decision: we embed {sub: user_id, role: role} in the JWT payload
rather than doing a DB lookup on every request just to check the role.
Role-based route guards (see deps.py) can then reject a request purely
from the decoded token, saving a DB round trip on every single call.
"""
import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise ValueError("Invalid or expired token")


def create_action_token(user_id: str, purpose: str, minutes: int = 60) -> str:
    """
    Short-lived, single-purpose token for flows like password reset and
    email verification. The `purpose` claim stops a password-reset token
    from being replayed as an email-verification token or vice versa --
    decode_action_token() checks it matches what the caller expects.
    """
    expire = datetime.utcnow() + timedelta(minutes=minutes)
    payload = {"sub": user_id, "purpose": purpose, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_action_token(token: str, expected_purpose: str) -> str:
    """Returns the user_id if the token is valid and for the right purpose."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise ValueError("This link is invalid or has expired")
    if payload.get("purpose") != expected_purpose:
        raise ValueError("This link is invalid or has expired")
    return payload["sub"]
