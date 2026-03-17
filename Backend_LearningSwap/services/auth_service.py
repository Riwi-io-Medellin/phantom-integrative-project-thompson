# services/auth_service.py

from sqlalchemy.orm import Session
from models.user import User
from core.security import verify_password, hash_password, create_access_token
from fastapi import HTTPException


# ---------- REGISTER ----------
def register_user(db: Session, user_data):
    # Creates a new user verifying that the email doesn't exist and hashing the password
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    new_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        phone=user_data.phone,
        hashed_password=hash_password(user_data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Usuario creado correctamente",
        "user_id": new_user.user_id
    }


# ---------- LOGIN ----------
def login_user(db: Session, user_data):
    # Authenticates a user and returns a JWT access token
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    access_token = create_access_token(
        data={"user_id": user.user_id}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "role": user.role
    }