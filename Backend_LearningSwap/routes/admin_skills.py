from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import get_current_admin
from models.skill import Skill
from models.user import User

router = APIRouter(prefix="/admin", tags=["Admin - Skills"])


# ---------- SCHEMAS ----------
class SkillCreate(BaseModel):
    name: str

class SkillUpdate(BaseModel):
    name: Optional[str] = None


# ---------- GET ALL ----------
@router.get("/skills", summary="Admin: List all skills")
def list_skills(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    skills = db.query(Skill).all()
    return [{"skill_id": s.skill_id, "name": s.name} for s in skills]


# ---------- CREATE ----------
@router.post("/skills", status_code=201, summary="Admin: Create skill")
def create_skill(
    data: SkillCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    name = data.name.strip().lower()
    if db.query(Skill).filter(Skill.name == name).first():
        raise HTTPException(status_code=400, detail="Ya existe una habilidad con ese nombre")

    skill = Skill(name=name)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return {"skill_id": skill.skill_id, "name": skill.name}


# ---------- UPDATE ----------
@router.put("/skills/{skill_id}", summary="Admin: Update skill")
def update_skill(
    skill_id: int,
    data: SkillUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    skill = db.query(Skill).filter(Skill.skill_id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Habilidad no encontrada")

    if data.name:
        skill.name = data.name.strip().lower()

    db.commit()
    db.refresh(skill)
    return {"skill_id": skill.skill_id, "name": skill.name}


# ---------- DELETE ----------
@router.delete("/skills/{skill_id}", status_code=204, summary="Admin: Delete skill")
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    skill = db.query(Skill).filter(Skill.skill_id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Habilidad no encontrada")

    db.delete(skill)
    db.commit()
