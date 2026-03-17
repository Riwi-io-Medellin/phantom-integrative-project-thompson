"""
Database configuration module.

Configures the SQLAlchemy engine, session, and declarative base.
Also initializes the Supabase client if credentials are provided.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import DATABASE_URL, SUPABASE_URL, SUPABASE_KEY

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Initialize Supabase Client (Supports Auth, Storage, etc.)
from supabase import create_client, Client

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# ---------- DB DEPENDENCY (centralized) ----------
def get_db():
    """
    Database session generator for dependency injection in FastAPI.
    Guarantees that the session is closed correctly even if an error occurs.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
