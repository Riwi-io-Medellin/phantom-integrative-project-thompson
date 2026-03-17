from sqlalchemy import Column, Integer, ForeignKey, Enum as SQLAlchemyEnum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from core.database import Base

# Enumeration indicating whether a user wants to learn or teach a skill.
class IntentEnum(enum.Enum):
    learn = 'learn'
    teach = 'teach'

# Table representing an association between a user and a skill (many-to-many), along with their intent (learn or teach).
class UserSkill(Base):
    __tablename__ = 'users_skills'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    skill_id = Column(Integer, ForeignKey('skills.skill_id'), nullable=False)
    intent = Column(SQLAlchemyEnum(IntentEnum, name="intentenum"), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'skill_id', 'intent', name='uq_user_skill_intent'),
    )

    user = relationship("User")
    skill = relationship("Skill")
