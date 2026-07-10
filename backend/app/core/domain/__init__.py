"""
Domain Layer Package

Lightweight business rules layer on top of models.
Only project.py survives — its ProjectLifecycle is used by routes/projects.py.
(The parallel research_spec/review/specification modules were dead and deleted
in WS0 0.8; the live validation logic is app/core/validation/spec_validator.py.)
"""

from .project import ProjectLifecycle, ProjectStatus

__all__ = [
    "ProjectLifecycle",
    "ProjectStatus",
]
