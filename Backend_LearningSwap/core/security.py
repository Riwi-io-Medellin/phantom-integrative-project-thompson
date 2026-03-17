"""
Security module.

Provides utility functions for password hashing, password verification,
generation of JWT access tokens, and the get_current_user dependency to protect endpoints.
"""

import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Hashes the user password
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

# Verifies the user password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )

# Generates a JWT token for the user
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Reusable dependency to protect endpoints.
    Decodes the JWT from the 'Authorization: Bearer <token>' header
    and returns the authenticated user from the database.
    """
    from core.database import SessionLocal
    from models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Open DB session to search for the user
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
    finally:
        db.close()

    if user is None:
        raise credentials_exception

    return user


def get_current_admin(current_user=Depends(get_current_user)):
    """
    Dependency that verifies if the authenticated user is an admin.
    Raises 403 if the role is not 'admin'.
    """
    from models.user import UserRole
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores"
        )
    return current_user