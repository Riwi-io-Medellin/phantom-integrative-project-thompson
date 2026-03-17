from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from models.user import User
from models.match import Match
from models.skill import Skill
from models.users_skills import UserSkill

router = APIRouter()

@router.get("/stats", summary="Get Platform Statistics")
def get_stats(db: Session = Depends(get_db)):
    # Count active users
    total_users = db.query(User).filter(User.is_active == True).count()

    # Count total matches
    total_matches = db.query(Match).count()

    # Count unique skills registered in the system
    total_skills = db.query(Skill).count()

    # Count skills that users are learning/teaching
    total_user_skills = db.query(UserSkill).count()

    return {
        "total_users": total_users,
        "total_matches": total_matches,
        "total_skills": total_skills,
        "total_user_skills": total_user_skills
    }
