from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from core.database import Base

# Table representing a message sent between two users in a chat room.
class Message(Base):
    __tablename__ = 'messages'

    message_id          = Column(Integer, primary_key=True, autoincrement=True)
    room_id             = Column(Integer, ForeignKey('chat_rooms.room_id'), nullable=False)
    sender_id           = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    message             = Column(Text, nullable=False)
    message_type        = Column(String(10), server_default='text')  # text | image | audio
    datetime_created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    room = relationship("ChatRoom")
    sender = relationship("User")
