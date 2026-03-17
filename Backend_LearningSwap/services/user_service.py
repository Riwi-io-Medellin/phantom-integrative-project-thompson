from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.user import User
from schemas.user import UserUpdateRequest

def get_user_profile(db: Session, user_id: int):
    # Retrieves complete profile data for a user, along with their skills
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    from models.users_skills import UserSkill, IntentEnum
    from models.skill import Skill
    
    # Skills they want to teach
    teach_skills_query = db.query(Skill.name).join(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.intent == IntentEnum.teach
    ).all()
    
    # Skills they want to learn
    learn_skills_query = db.query(Skill.name).join(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.intent == IntentEnum.learn
    ).all()

    # We format a new dictionary to match the response schema
    profile_data = {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "phone": user.phone,
        "points": user.points,
        "skills_to_teach": [s[0] for s in teach_skills_query],
        "skills_to_learn": [s[0] for s in learn_skills_query]
    }
    
    return profile_data

from fastapi import HTTPException, UploadFile
import uuid
from core.database import supabase

def update_user_profile(db: Session, user_id: int, data: UserUpdateRequest, foto: UploadFile = None):
    # Updates profile data and optionally uploads a new image to Supabase
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # --- SUPABASE IMAGE UPLOAD LOGIC ---
    if foto and supabase:
        try:
            # We generate a unique name to avoid overwriting photos of others
            file_extension = foto.filename.split(".")[-1]
            unique_filename = f"{user_id}_{uuid.uuid4().hex}.{file_extension}"
            
            # Upload the file to the 'avatars' bucket (You must create this bucket in Supabase)
            # foto.file.read() reads the bytes of the image
            res = supabase.storage.from_("avatars").upload(
                file=foto.file.read(),
                path=unique_filename,
                file_options={"content-type": foto.content_type}
            )
            
            # We get the public URL to save it in the Database
            public_url = supabase.storage.from_("avatars").get_public_url(unique_filename)
            
            # We assign that URL to our 'data' object so it gets saved below
            data.avatar_url = public_url

        except Exception as e:
            # If something fails with the upload, tell the Front
            raise HTTPException(status_code=500, detail=f"Error subiendo imagen: {str(e)}")
            
    # --- END IMAGE LOGIC ---
    
    # We only update fields sent by the Frontend (which are not None)
    update_data = data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    
    return user
