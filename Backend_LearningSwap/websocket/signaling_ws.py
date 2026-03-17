from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from core.security import SECRET_KEY, ALGORITHM

router = APIRouter()

# Active signaling rooms: { room_id: { user_id: WebSocket } }
# Maximum 2 users per room (1-to-1 call)
signal_rooms: dict[int, dict[int, WebSocket]] = {}


@router.websocket("/ws/signal/{room_id}")
async def signaling(
    websocket: WebSocket,
    room_id: int,
    token: str = Query(...)
):

    # 1. Validate JWT before accepting
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    # 2. Check that the room is not full (maximum 2 users)
    room = signal_rooms.setdefault(room_id, {})
    if len(room) >= 2 and user_id not in room:
        await websocket.close(code=4002)  # room full
        return

    await websocket.accept()
    room[user_id] = websocket

    print(f"Usuario {user_id} conectado a sala de señalización {room_id}")

    try:
        while True:
            data = await websocket.receive_json()

            # Add who sends the message
            data["from_user_id"] = user_id

            # Forward the message ONLY to the other user in the room
            for uid, ws in room.items():
                if uid != user_id:
                    await ws.send_json(data)

    except WebSocketDisconnect:
        # Clear the user from the room
        room.pop(user_id, None)

        # Notify the other user that it hung up
        for uid, ws in room.items():
            try:
                await ws.send_json({"type": "hang-up", "from_user_id": user_id})
            except Exception:
                pass

        # Clear room if it becomes empty
        if not room:
            del signal_rooms[room_id]

        print(f"Usuario {user_id} desconectado de sala de señalización {room_id}")
