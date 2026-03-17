from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.user import User
from schemas.user import UserProfileResponse, UserUpdateRequest
from services.user_service import get_user_profile, update_user_profile
from fastapi import UploadFile, File, Form, HTTPException

router = APIRouter()

# ---------- GET PROFILE ----------
@router.get("/users/{user_id}", response_model=UserProfileResponse, summary="Get User Profile")
def read_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_profile(db, user_id)

# ---------- GET MY PROFILE ----------
@router.get("/me", response_model=UserProfileResponse, summary="Get My Profile")
def read_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_profile(db, current_user.user_id)

# ---------- UPDATE PROFILE ----------
@router.put("/users/{user_id}", response_model=UserProfileResponse, summary="Update User Profile")
def edit_user_profile(
    user_id: int,
    first_name: str = Form(None),
    last_name: str = Form(None),
    bio: str = Form(None),
    phone: str = Form(None),
    foto: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="No puedes editar el perfil de otro usuario")
    data = UserUpdateRequest(first_name=first_name, last_name=last_name, bio=bio, phone=phone)
    return update_user_profile(db, user_id, data, foto)
