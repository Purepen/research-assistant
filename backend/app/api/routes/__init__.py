"""
API Routes Package

REST endpoint definitions
"""

from .auth import router as auth_router
from .research import router as research_router
from .projects import router as projects_router
from .user import router as user_router

__all__ = [
    "auth_router",
    "research_router",
    "projects_router",
    "user_router",
]
