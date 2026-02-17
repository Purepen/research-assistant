"""
Utility Functions Package

Helper functions for file handling, deduplication, and result packaging.
"""

from .deduplication import deduplicate_projects
from .file_handlers import load_docx_safely, load_user_dumps
from .save_package import save_complete_package

__all__ = [
    "deduplicate_projects",
    "load_docx_safely",
    "load_user_dumps",
    "save_complete_package",
]
