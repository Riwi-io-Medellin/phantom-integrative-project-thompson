from pydantic import BaseModel
from typing import List

# Schema for a user skills request.
# NOTE: user_id is NO LONGER sent — the backend extracts it from the JWT token
class UserSkillsRequest(BaseModel):
    learn_skills: List[str]  # List of skills they want to learn
    teach_skills: List[str]  # List of skills they want to teach
