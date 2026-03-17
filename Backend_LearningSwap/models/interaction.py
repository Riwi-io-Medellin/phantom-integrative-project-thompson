from sqlalchemy import Column, Integer, ForeignKey, Enum, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
from core.database import Base

# Enumerated type for interaction types (like or pass).
class ActionEnum(str, enum.Enum):
    like = 'like'
    pass_ = 'pass'  # We use pass_ because 'pass' is a reserved keyword in Python

# Table representing an interaction (swipe) between two users.
class Interaction(Base):
    __tablename__ = 'interactions'
    
    # Primary key of the interactions table
    interaction_id = Column(Integer, primary_key=True, autoincrement=True)
    user_from_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    user_to_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    actions = Column(Enum(ActionEnum), nullable=False)
    datetime_created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        UniqueConstraint('user_from_id', 'user_to_id', name='uq_interaction_users'),
    )

    user_from = relationship("User", foreign_keys=[user_from_id])
    user_to = relationship("User", foreign_keys=[user_to_id])
