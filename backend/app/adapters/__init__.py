"""
Adapters Package

Wrap external dependencies so they can be swapped without changing core code.
Purpose: Abstract external APIs (OpenAI, Resend, S3/Storage)
"""

from .openai_adapter import OpenAIAdapter
from .email_adapter import EmailAdapter
from .storage_adapter import StorageAdapter

__all__ = [
    "OpenAIAdapter",
    "EmailAdapter",
    "StorageAdapter",
]
