from pydantic import BaseModel, EmailStr
from typing import Optional, List

# Schema for registering a new user.
class UserCreate(BaseModel):
    first_name: str
    last_name: str 
    email: EmailStr
    password: str
    phone: str

# Schema for user login.
class UserLogin(BaseModel):
    email: EmailStr 
    password: str 

# Schema for the user profile response.
class UserProfileResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: EmailStr
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    skills_to_learn: List[str] = []
    skills_to_teach: List[str] = []
    points: int = 0

# Schema for updating the user profile.
class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None