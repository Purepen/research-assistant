"""
API Dependencies — FIXED

Change from broken version:
  SessionLocal is now exported at module level so background tasks
  (which run after the request session is closed) can create their own
  database sessions independently.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.services.auth_service import AuthService
from app.models.database import User, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./research_assistant.db")

# Some providers (Fly Postgres, formerly Heroku) hand out "postgres://" URLs;
# SQLAlchemy 2.0 only registers the "postgresql://" dialect name.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Add check_same_thread=False for SQLite only (ignored by other DBs)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# SessionLocal is exported so background tasks can open their own sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables on startup
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

security = HTTPBearer()
auth_service = AuthService()


def get_db_session():
    """
    Request-scoped database session dependency.
    Opens a session at the start of the request and closes it on completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session),
) -> User:
    """
    Decode the JWT token and return the authenticated User object.
    Raises 401 if the token is invalid/expired, 403 if the account is inactive.
    """
    token = credentials.credentials
    user = auth_service.get_current_user(token, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user