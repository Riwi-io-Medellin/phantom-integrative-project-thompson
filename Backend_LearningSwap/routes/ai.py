from fastapi import APIRouter
from pydantic import BaseModel
from services.ai_service import ask_ai

router = APIRouter()

# Request model for the AI route
class AIRequest(BaseModel):
    message: str

from fastapi import HTTPException

# Route to interact with the AI assistant
@router.post("/ai", summary="Interact with the AI Assistant")
def ai_chat(request: AIRequest):
    try:
        # Sends the message to the AI service and returns the generated response
        answer = ask_ai(request.message)
        return {"response": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))