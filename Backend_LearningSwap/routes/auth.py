from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from schemas.user import UserCreate, UserLogin
from services.auth_service import register_user, login_user

router = APIRouter()


# ---------- REGISTER ----------
@router.post("/register", summary="Register a new user")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Registers a new user in the database
    return register_user(db, user)


# ---------- LOGIN ----------
@router.post("/login", summary="User Login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    # Authenticates the user and returns the JWT token
    return login_user(db, user)