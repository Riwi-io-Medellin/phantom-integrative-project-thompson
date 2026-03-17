import random
from google import genai
from core.config import GEMINI_API_KEY

ai = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-3-flash-preview"

def ask_ai(message: str) -> str:
    try:
        response = ai.models.generate_content(
            model=MODEL_NAME,
            contents=message
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error en Gemini: {e}")
        raise Exception(f"Error conectando a Gemini: {str(e)}")


def moderate_and_comment(message: str, recent_messages: list[dict]) -> str | None:
    """
    Checks if the message contains profanity (always warns) and with a 40%
    probability comments on the conversation. Returns None if it decides not to speak.
    """
    should_comment = random.random() < 0.40

    # Context of the last messages
    context = "\n".join(
        [f"Usuario {m['user_id']}: {m['message']}" for m in recent_messages[-5:]]
    ) or "(inicio de conversación)"

    prompt = f"""Eres un asistente de aprendizaje amigable en una plataforma donde dos personas intercambian habilidades.

Conversación reciente:
{context}

Nuevo mensaje: "{message}"

Instrucciones:
1. Si el mensaje tiene groserías o lenguaje irrespetuoso → da una advertencia amable. Esto es obligatorio.
2. {"Puedes opinar brevemente sobre el tema que discuten (máximo 1-2 oraciones cortas). Solo si agrega valor." if should_comment else "No hagas comentarios adicionales hoy."}

Si no hay groserías y no tienes nada útil que aportar, responde exactamente la palabra: SILENCIO
Si sí respondes, escribe directamente el mensaje sin prefijos como 'Asistente:' ni 'IA:'."""

    try:
        response = ai.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )
        result = response.text.strip()
        return None if result == "SILENCIO" else result
    except Exception as e:
        print(f"Error en Gemini Moderación: {e}")
        return None