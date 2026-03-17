from pydantic import BaseModel
from typing import List, Optional
from models.interaction import ActionEnum

# Schema for an interaction (swipe) request.
# NOTE: user_from_id is NO LONGER sent — the backend extracts it from the JWT token
class InteractionRequest(BaseModel):
    user_to_id: int     # The user of the card that was swiped
    action: ActionEnum  # "like" or "pass"

# Schema for a skill in the feed.
class SkillResponse(BaseModel):
    name: str

# Schema for a user in the feed.
class FeedUserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    
    # Skills they have to teach/learn (optional to show on card)
    skills_to_teach: List[str] = []
    skills_to_learn: List[str] = []

# Schema for the feed response.
class FeedResponse(BaseModel):
    users: List[FeedUserResponse]
