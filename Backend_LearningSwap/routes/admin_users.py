from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from core.database import get_db
from core.security import get_current_admin, hash_password
from models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["Admin - Users"])


# ---------- SCHEMAS ----------
class UserCreateAdmin(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: Optional[str] = "user"
    password: str

class UserUpdateAdmin(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ---------- GET ALL ----------
@router.get("/users", summary="Admin: List all users")
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    users = db.query(User).all()
    return [
        {
            "user_id": u.user_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "points": u.points
        }
        for u in users
    ]


# ---------- CREATE ----------
@router.post("/users", status_code=201, summary="Admin: Create user")
def create_user(
    data: UserCreateAdmin,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        role=UserRole(data.role)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.user_id, "email": user.email, "role": str(user.role)}


# ---------- UPDATE ----------
@router.put("/users/{user_id}", summary="Admin: Update user")
def update_user(
    user_id: int,
    data: UserUpdateAdmin,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    # Convert role to Enum if provided
    if "role" in update_data:
        update_data["role"] = UserRole(update_data["role"])

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return {"user_id": user.user_id, "email": user.email, "role": str(user.role), "is_active": user.is_active}


# ---------- DEACTIVATE (soft delete) ----------
@router.delete("/users/{user_id}", summary="Admin: Deactivate user")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="El usuario ya está inactivo")

    user.is_active = False
    db.commit()
    return {"msg": "Usuario desactivado correctamente", "user_id": user_id}
