from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, CheckConstraint, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from core.database import Base

# Table representing a successful match between two users.
class Match(Base):
    __tablename__ = 'matches'
    
    # Primary key of the matches table
    match_id = Column(Integer, primary_key=True, autoincrement=True)
    user1_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    user2_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    datetime_created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_completed = Column(Boolean, default=False)
    
    # Constraints of the matches table
    __table_args__ = (
        UniqueConstraint('user1_id', 'user2_id', name='uq_match_users'),
        CheckConstraint('user1_id < user2_id', name='chk_user1_less_than_user2'),
    )

    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
