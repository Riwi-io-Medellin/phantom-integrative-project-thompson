from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, Text, DateTime
from sqlalchemy.orm import relationship 
import enum
from datetime import datetime, timezone
from core.database import Base 

# Enumerated type for the different roles a user can have within the platform.
class UserRole(str, enum.Enum):
    user = 'user'
    admin = 'admin'
    superadmin = 'superadmin'
    teacher = 'teacher'

# Table representing a user in the system.
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20))
    role = Column(Enum(UserRole), default=UserRole.user)
    plan_id = Column(Integer, ForeignKey("plans.plan_id"))
    is_active = Column(Boolean, default=True)
    bio = Column(Text)
    avatar_url = Column(String(255))
    points = Column(Integer, default=0)
    datetime_created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    plan = relationship("Plan")