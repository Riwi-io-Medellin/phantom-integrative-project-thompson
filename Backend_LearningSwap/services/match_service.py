from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.user import User
from models.interaction import Interaction, ActionEnum
from models.match import Match
from models.chat_room import ChatRoom
from schemas.match import InteractionRequest

def create_interaction(db: Session, data: InteractionRequest, user_from_id: int):
    # Records a Like or Pass. If it's a mutual Like, creates a Match and its chat room
    # 1. Validate that users exist
    user_from = db.query(User).filter(User.user_id == user_from_id).first()
    user_to = db.query(User).filter(User.user_id == data.user_to_id).first()
    
    if not user_from or not user_to:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if user_from_id == data.user_to_id:
        raise HTTPException(status_code=400, detail="No puedes darte like a ti mismo")

    # 2. Check if the interaction already exists (avoid double like)
    existing_interaction = db.query(Interaction).filter(
        Interaction.user_from_id == user_from_id,
        Interaction.user_to_id == data.user_to_id
    ).first()

    if existing_interaction:
        raise HTTPException(status_code=400, detail="Ya interactuaste con este usuario")

    # 3. Save the interaction (Like or Pass)
    new_interaction = Interaction(
        user_from_id=user_from_id,
        user_to_id=data.user_to_id,
        actions=data.action
    )
    db.add(new_interaction)
    
    # 4. MATCH LOGIC: Only check if it was a "like"
    is_match = False
    if data.action == ActionEnum.like:
        # Ask the DB: Has user_to already liked user_from before?
        mutual_like = db.query(Interaction).filter(
            Interaction.user_from_id == data.user_to_id,
            Interaction.user_to_id == user_from_id,
            Interaction.actions == ActionEnum.like
        ).first()

        if mutual_like:
            is_match = True
            
            # Sort IDs to satisfy the CheckConstraint('user1_id < user2_id')
            user1_id = min(user_from_id, data.user_to_id)
            user2_id = max(user_from_id, data.user_to_id)
            
            # Create the Match in the matches table
            new_match = Match(user1_id=user1_id, user2_id=user2_id)
            db.add(new_match)
            db.flush()  # To get the generated match_id
            
            # CREATE THE CHAT ROOM automatically!
            new_chat_room = ChatRoom(match_id=new_match.match_id)
            db.add(new_chat_room)

    db.commit()

    if is_match:
        return {
            "msg": "¡It's a Match!", 
            "match_created": True,
            "room_id": new_chat_room.room_id
        }
    return {"msg": "Interacción guardada", "match_created": False}

def get_user_feed(db: Session, current_user_id: int):
    from models.users_skills import UserSkill, IntentEnum
    from models.skill import Skill

    # 1. IDs of users already swiped (to exclude them)
    excluded_ids = [u[0] for u in db.query(Interaction.user_to_id).filter(
        Interaction.user_from_id == current_user_id
    ).all()]
    excluded_ids.append(current_user_id)

    # 2. My skills (what I want to learn and what I teach) — 2 queries
    my_learn = set(s[0] for s in db.query(UserSkill.skill_id).filter(
        UserSkill.user_id == current_user_id,
        UserSkill.intent == IntentEnum.learn
    ).all())

    my_teach = set(s[0] for s in db.query(UserSkill.skill_id).filter(
        UserSkill.user_id == current_user_id,
        UserSkill.intent == IntentEnum.teach
    ).all())

    # 3. Available users — 1 query (limit to 50 candidates before filtering)
    available_users = db.query(User).filter(
        User.user_id.notin_(excluded_ids)
    ).order_by(User.datetime_created_at.desc()).limit(50).all()

    available_ids = [u.user_id for u in available_users]

    # 4. A SINGLE query for ALL their skills with names — eliminates N+1
    all_skills = db.query(
        UserSkill.user_id,
        UserSkill.skill_id,
        UserSkill.intent,
        Skill.name
    ).join(Skill, UserSkill.skill_id == Skill.skill_id).filter(
        UserSkill.user_id.in_(available_ids)
    ).all()

    # 5. Organize in memory (without querying the DB again)
    user_teach_ids = {}    # user_id -> set of skill_ids to teach
    user_learn_ids = {}    # user_id -> set of skill_ids to learn
    user_teach_names = {}  # user_id -> list of names to teach
    user_learn_names = {}  # user_id -> list of names to learn

    for uid, sid, intent, name in all_skills:
        if intent == IntentEnum.teach:
            user_teach_ids.setdefault(uid, set()).add(sid)
            user_teach_names.setdefault(uid, []).append(name)
        else:
            user_learn_ids.setdefault(uid, set()).add(sid)
            user_learn_names.setdefault(uid, []).append(name)

    compatible_users = []
    other_users = []

    for p_user in available_users:
        uid = p_user.user_id
        their_teach = user_teach_ids.get(uid, set())
        their_learn = user_learn_ids.get(uid, set())

        is_compatible = (
            bool(my_learn & their_teach) or
            bool(my_teach & their_learn)
        )

        user_data = {
            "user_id": uid,
            "first_name": p_user.first_name,
            "last_name": p_user.last_name,
            "bio": p_user.bio,
            "avatar_url": p_user.avatar_url,
            "skills_to_teach": user_teach_names.get(uid, []),
            "skills_to_learn": user_learn_names.get(uid, []),
        }

        if is_compatible:
            compatible_users.append(user_data)
        else:
            other_users.append(user_data)

    # Compatibles first, the rest as fallback. Maximum 30 cards.
    return {"users": (compatible_users + other_users)[:30]}

def get_user_matches(db: Session, user_id: int):
    # Returns all successful matches of a user and the corresponding chat IDs
    from sqlalchemy import or_
    
    # Find all matches where this user is user1 or user2
    matches = db.query(Match).filter(
        or_(
            Match.user1_id == user_id,
            Match.user2_id == user_id
        )
    ).all()
    
    result = []
    
    for match in matches:
        # Determine who the OTHER person is
        if match.user1_id == user_id:
            other_user = db.query(User).filter(User.user_id == match.user2_id).first()
        else:
            other_user = db.query(User).filter(User.user_id == match.user1_id).first()
        
        # Find the chat room associated with this match
        chat_room = db.query(ChatRoom).filter(ChatRoom.match_id == match.match_id).first()
        
        result.append({
            "match_id": match.match_id,
            "room_id": chat_room.room_id if chat_room else None,
            "user_id": other_user.user_id,
            "first_name": other_user.first_name,
            "last_name": other_user.last_name,
            "avatar_url": other_user.avatar_url,
            "bio": other_user.bio,
            "is_completed": match.is_completed
        })
    
    return {"matches": result}

def finish_match_session(db: Session, match_id: int):
    """
    Finishes a match (completed learning session).
    Awards points to both users for having finished the exchange
    and marks the match as 'is_completed = True' to prevent repetitions.
    """
    match = db.query(Match).filter(Match.match_id == match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match no encontrado.")
        
    if match.is_completed:
        raise HTTPException(status_code=400, detail="Este match ya fue finalizado y los puntos ya se otorgaron.")
        
    # Get corresponding users
    user1 = db.query(User).filter(User.user_id == match.user1_id).first()
    user2 = db.query(User).filter(User.user_id == match.user2_id).first()
    
    # -------------------------------------------------------------
    # POINTS CONFIGURATION: We award 50 points per completed match
    # -------------------------------------------------------------
    POINTS_REWARD = 50
    user1.points += POINTS_REWARD
    user2.points += POINTS_REWARD
    
    # Block so points are not added again
    match.is_completed = True
    
    db.commit()
    
    return {
        "msg": "Match finalizado con éxito.",
        "puntos_otorgados": POINTS_REWARD,
        "user1": {"user_id": user1.user_id, "nuevos_puntos": user1.points},
        "user2": {"user_id": user2.user_id, "nuevos_puntos": user2.points}
    }
