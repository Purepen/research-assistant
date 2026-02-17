"""
Domain Layer Package

Lightweight business rules layer on top of models.
Keeps business logic separate from data structures.
"""

from .specification import validate_specification, check_completeness
from .review import calculate_pass_fail, get_improvement_summary
from .project import ProjectLifecycle, ProjectStatus

__all__ = [
    "validate_specification",
    "check_completeness",
    "calculate_pass_fail",
    "get_improvement_summary",
    "ProjectLifecycle",
    "ProjectStatus",
]
