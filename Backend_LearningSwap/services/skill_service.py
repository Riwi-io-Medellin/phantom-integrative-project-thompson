from sqlalchemy.orm import Session
from models.user import User
from models.skill import Skill
from models.users_skills import UserSkill, IntentEnum
from schemas.skill import UserSkillsRequest
from fastapi import HTTPException

def save_user_skills(db: Session, data: UserSkillsRequest, user_id: int):
    # Guarda las habilidades que un usuario quiere aprender o enseñar, creandolas si no existen
    # Verificamos si el usuario existe (user_id viene del token JWT)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Internal function to process a list of skills and their intent
    def _process_skills(skills_list, intent):
        for skill_name in skills_list:
            # Check if the skill (e.g. "React") already exists in the global DB
            skill_name = skill_name.strip().lower()
            skill = db.query(Skill).filter(Skill.name == skill_name).first()
            
            # If it doesn't exist, we create it so others can use it too
            if not skill:
                skill = Skill(name=skill_name)
                db.add(skill)
                db.flush() # flush() assigns a skill_id without permanently saving yet

            # Now check if the user already has this skill with this intent
            existing_link = db.query(UserSkill).filter(
                UserSkill.user_id == user.user_id,
                UserSkill.skill_id == skill.skill_id,
                UserSkill.intent == intent
            ).first()

            # If it doesn't exist, we create the link in the intermediate table
            if not existing_link:
                user_skill = UserSkill(
                    user_id=user.user_id,
                    skill_id=skill.skill_id,
                    intent=intent
                )
                db.add(user_skill)

    # Process the two lists coming from the frontend
    _process_skills(data.learn_skills, IntentEnum.learn)
    _process_skills(data.teach_skills, IntentEnum.teach)

    # Save all changes
    db.commit()

    return {"msg": "Habilidades guardadas exitosamente"}
