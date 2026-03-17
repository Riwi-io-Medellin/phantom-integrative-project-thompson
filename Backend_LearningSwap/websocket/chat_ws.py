import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from core.database import get_db, SessionLocal
from core.security import SECRET_KEY, ALGORITHM
from models.message import Message
from jose import JWTError, jwt

router = APIRouter()

# Active rooms: { room_id: [websocket, ...] }
rooms: dict[int, list[WebSocket]] = {}

# Recent history per room to give context to the AI (last 10 messages)
room_history: dict[int, list[dict]] = {}


# ---------- MESSAGES HISTORY ----------
@router.get("/messages/{room_id}", summary="Get Chat Room Messages")
def get_messages(room_id: int, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(
        Message.room_id == room_id
    ).order_by(Message.datetime_created_at.asc()).all()

    return {
        "messages": [
            {
                "message_id": msg.message_id,
                "user_id": msg.sender_id,
                "message": msg.message,
                "created_at": str(msg.datetime_created_at)
            }
            for msg in messages
        ]
    }


# ---------- WEBSOCKET CHAT ----------
@router.websocket("/ws/chat/{conversation_id}")
async def chat(
    websocket: WebSocket,
    conversation_id: int,
    token: str = Query(...)
):
    # Validate JWT before accepting connection
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await websocket.accept()

    # Register in the room
    if conversation_id not in rooms:
        rooms[conversation_id] = []
    rooms[conversation_id].append(websocket)

    # Initialize room history if it doesn't exist
    if conversation_id not in room_history:
        room_history[conversation_id] = []

    print(f"Usuario {user_id} conectado a sala {conversation_id}")

    try:
        while True:
            data = await websocket.receive_json()

            # Force the message user_id to be that of the token (security)
            data["user_id"] = user_id

            # Save the message in the Database
            db = SessionLocal()
            try:
                msg_type = data.get("type", "text")
                # Only valid types are accepted — any other is treated as text
                if msg_type not in ("text", "image", "audio"):
                    msg_type = "text"
                new_message = Message(
                    room_id=conversation_id,
                    sender_id=user_id,
                    message=data.get("message"),
                    message_type=msg_type
                )
                db.add(new_message)
                db.commit()

                data["message_id"] = new_message.message_id
                data["created_at"] = str(new_message.datetime_created_at)
                data["type"] = msg_type
            finally:
                db.close()

            # Update in-memory history for AI
            room_history[conversation_id].append({
                "user_id": user_id,
                "message": data.get("message")
            })
            # Keep only the last 10 messages
            if len(room_history[conversation_id]) > 10:
                room_history[conversation_id].pop(0)

            # Broadcast the message to everyone in the room
            for connection in rooms[conversation_id]:
                await connection.send_json(data)

            # Call AI in the background (doesn't block chat)
            asyncio.create_task(
                _ai_moderate(conversation_id, data.get("message"), room_history[conversation_id].copy())
            )

    except WebSocketDisconnect:
        rooms[conversation_id].remove(websocket)

        # Fix memory leak: clear the room if it becomes empty
        if not rooms[conversation_id]:
            del rooms[conversation_id]
            room_history.pop(conversation_id, None)

        print(f"Usuario {user_id} desconectado de sala {conversation_id}")


async def _ai_moderate(conversation_id: int, message: str, history: list[dict]):
    """
    Background task: AI checks the message and responds if necessary.
    By being a separate async task, it doesn't slow down the chat.
    """
    try:
        from services.ai_service import moderate_and_comment

        # Call OpenAI in a separate thread so it doesn't block the event loop
        ai_response = await asyncio.to_thread(moderate_and_comment, message, history)

        if ai_response and conversation_id in rooms:
            ai_message = {
                "user_id": 0,            # 0 = AI assistant identifier
                "username": "Asistente IA 🤖",
                "message": ai_response,
                "message_id": None,
                "is_ai": True,
                "created_at": None
            }
            for connection in rooms[conversation_id]:
                await connection.send_json(ai_message)

    except Exception as e:
        # If the AI fails (API down, etc.) the chat keeps working
        print(f"Error en IA moderación: {e}")