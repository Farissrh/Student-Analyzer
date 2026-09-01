"""
Autentikasi: hashing password + JWT token.

Sengaja pakai library yang PURE PYTHON (hashlib bawaan + PyJWT) - bukan
passlib/bcrypt - supaya tidak ada risiko error compile Rust/C seperti yang
sempat terjadi waktu install pydantic-core di Python 3.14 kemarin.
"""
import os
import hashlib
import hmac as hmac_lib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# PENTING: di production, set environment variable JWT_SECRET_KEY ke string acak
# yang panjang & rahasia. Nilai default ini HANYA untuk development.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-jangan-dipakai-di-production-ganti-ini")
ALGORITHM = "HS256"
EXPIRE_MINUTES = 60 * 24  # token berlaku 24 jam

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 dengan salt acak. Format simpan: 'salt_hex$hash_hex'."""
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return f"{salt}${hashed.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hashed_hex = stored.split("$")
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return hmac_lib.compare_digest(check.hex(), hashed_hex)


def create_access_token(user_id: int, role: str, nama: str) -> str:
    """role: 'guru' atau 'siswa'."""
    payload = {
        "sub": str(user_id),
        "role": role,
        "nama": nama,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sudah kedaluwarsa, silakan login ulang")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token tidak valid")


class CurrentUser:
    def __init__(self, user_id: int, role: str, nama: str):
        self.user_id = user_id
        self.role = role
        self.nama = nama


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> CurrentUser:
    """Dependency: siapa saja yang sudah login (guru atau siswa)."""
    payload = decode_access_token(creds.credentials)
    return CurrentUser(user_id=int(payload["sub"]), role=payload["role"], nama=payload["nama"])


def require_guru(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency: khusus endpoint yang cuma boleh diakses guru."""
    if current.role != "guru":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Endpoint ini khusus untuk guru")
    return current
