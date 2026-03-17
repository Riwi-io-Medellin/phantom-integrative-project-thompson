from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from models.user import User
from schemas.match import InteractionRequest
from services.match_service import create_interaction

router = APIRouter()

# ---------- SWIPES LIKES AND PASSES ----------
@router.post("/swipe", summary="Record a User Swipe")
def swipe_user(
    data: InteractionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # user_from_id is extracted from the JWT token, not from the body
    return create_interaction(db, data, user_from_id=current_user.user_id)

@router.get("/feed", response_model=dict, summary="Get User Feed")
def get_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.match_service import get_user_feed
    return get_user_feed(db, current_user_id=current_user.user_id)

@router.get("/matches", response_model=dict, summary="Get User Matches")
def get_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.match_service import get_user_matches
    return get_user_matches(db, user_id=current_user.user_id)

@router.post("/matches/{match_id}/finish", summary="Finish a match and grant points")
def finish_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.match_service import finish_match_session
    return finish_match_session(db, match_id)
