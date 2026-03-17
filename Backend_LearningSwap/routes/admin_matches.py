from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_admin
from models.match import Match
from models.chat_room import ChatRoom
from models.user import User

router = APIRouter(prefix="/admin", tags=["Admin - Matches"])


# ---------- GET ALL ----------
@router.get("/matches", summary="Admin: List all matches")
def list_matches(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin)
):
    matches = db.query(Match).all()
    result = []
    for m in matches:
        chat_room = db.query(ChatRoom).filter(ChatRoom.match_id == m.match_id).first()
        result.append({
            "match_id": m.match_id,
            "user1_id": m.user1_id,
            "user2_id": m.user2_id,
            "status": "completed" if m.is_completed else "matched",
            "room_id": chat_room.room_id if chat_room else None,
            "created_at": str(m.datetime_created_at)
        })
    return {"matches": result}
