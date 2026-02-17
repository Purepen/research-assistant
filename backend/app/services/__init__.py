"""
Services Layer Package

Business logic layer that wraps pipelines for API consumption.
Purpose: Orchestrate workflows, handle state management, coordinate adapters
"""

from .research_service import ResearchService
from .auth_service import AuthService
from .storage_service import StorageService

__all__ = [
    "ResearchService",
    "AuthService",
    "StorageService",
]
