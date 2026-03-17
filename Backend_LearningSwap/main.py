# Main entry point of the FastAPI application, initializes routes and dependencies.
from fastapi import FastAPI
from core.database import Base, engine
from models.plan import Plan
from models.skill import Skill
from models.user import User
from models.users_skills import UserSkill
from models.interaction import Interaction
from models.match import Match
from models.chat_room import ChatRoom
from models.message import Message
from routes.auth import router as auth_router
from middlewares.cors import add_cors_middleware
from routes.ai import router as ai_router
from routes.skill import router as skill_router
from routes.match import router as match_router
from routes.user import router as user_router
from routes.stats import router as stats_router
from routes.chat import router as chat_router
from routes.admin_skills import router as admin_skills_router
from routes.admin_users import router as admin_users_router
from routes.admin_matches import router as admin_matches_router

# import websocket
from websocket.chat_ws import router as chat_ws_router
from websocket.signaling_ws import router as signal_ws_router

app = FastAPI()

# CORS
add_cors_middleware(app)

# create tables
Base.metadata.create_all(bind=engine)

# normal routes
app.include_router(auth_router)

# websocket
app.include_router(chat_ws_router)
app.include_router(signal_ws_router)


app.include_router(ai_router)

# skills onboarding
app.include_router(skill_router)

# matching and swipes system
app.include_router(match_router)

# user profile
app.include_router(user_router)

# platform statistics
app.include_router(stats_router)

# chat (file upload)
app.include_router(chat_router)

# admin panel
app.include_router(admin_skills_router)
app.include_router(admin_users_router)
app.include_router(admin_matches_router)