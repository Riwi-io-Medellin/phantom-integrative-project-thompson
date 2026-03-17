# Learning Swap - Backend

Welcome to the backend repository of **Learning Swap**, a dynamic platform designed to connect individuals who want to exchange skills and learn from one another. This backend powers the entire platform, handling complex user matching, real-time messaging, WebRTC video signaling, and more.

## Features

- **User Authentication & Profiles:** Secure registration, login, and comprehensive profile management using JWT and bcrypt.
- **Skill Matching & Swipes:** An intuitive, swipe-based matching system that connects users based on the skills they offer and the skills they want to learn.
- **Real-Time Chat:** WebSocket-based real-time messaging enabling seamless communication between matched users.
- **Video Call Signaling:** Built-in WebRTC signaling support via WebSockets to facilitate peer-to-peer video calls.
- **AI Integration:** Smart integrations utilizing OpenAI and Google GenAI APIs.
- **Admin Dashboard:** Comprehensive administrative routes to manage users, skills, and matches.
- **Platform Analytics:** Endpoints to track usage and interaction statistics across the platform.

## Tech Stack

- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) - High-performance async web framework.
- **Database & ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) integrated with PostgreSQL (Supabase support included).
- **Real-Time:** WebSockets
- **Authentication:** `python-jose` (JWT), `bcrypt`
- **Data Validation:** Pydantic
- **AI Integrations:** `openai`, `google-genai`

## Project Structure

```text
├── core/             # Core configurations (Database setup, env vars, etc.)
├── models/           # SQLAlchemy database models (Users, Matches, Skills, etc.)
├── schemas/          # Pydantic schemas for request/response data validation
├── routes/           # FastAPI HTTP endpoints (Auth, Users, Matches, Chat, Admin, etc.)
├── websocket/        # WebSocket routers for Chat and WebRTC Signaling
├── services/         # Reusable business logic and helper functions
├── middlewares/      # Custom middlewares e.g. CORS configuration
├── main.py           # Application entry point
└── requirements.txt  # Project dependencies
```

## Prerequisites

- Python 3+
- PostgreSQL database (or a Supabase project)

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Learning_Swap
   ```

2. **Create a virtual environment**
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment**
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **Mac/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install all required libraries**
   ```bash
   pip install -r requirements.txt
   ```

5. **Environment Setup**
   Ensure an environment file (e.g., `.env`) is properly configured in the root directory with your DB credentials, JWT secret keys, and API keys.

## Running the Server

Start the application using Uvicorn with live auto-reload:

```bash
uvicorn main:app --reload
```

Once running, the server will be available at: `http://localhost:8000`

### API Documentation
FastAPI automatically generates interactive API documentation. When the server is running, you can access them at:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Stopping the Server
To stop the server, press `Ctrl + C` in the terminal running Uvicorn.