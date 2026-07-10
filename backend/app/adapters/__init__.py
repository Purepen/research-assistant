"""
Adapters Package

Wrap external dependencies so they can be swapped without changing core code.
Purpose: Abstract external APIs (Resend, S3/Storage)
(openai_adapter was dead — the pipeline talks to OpenAI via the Agents SDK.)
"""

from .email_adapter import EmailAdapter
from .storage_adapter import StorageAdapter

__all__ = [
    "EmailAdapter",
    "StorageAdapter",
]
