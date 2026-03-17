from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.user import User
from schemas.skill import UserSkillsRequest
from services.skill_service import save_user_skills

router = APIRouter()

# ---------- SKILLS ONBOARDING ----------
@router.post("/onboarding/skills", summary="Add User Skills Onboarding")
def add_user_skills(
    data: UserSkillsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return save_user_skills(db, data, user_id=current_user.user_id)
