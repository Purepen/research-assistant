"""
Project Domain Logic

Purpose: Lifecycle state machine for projects
Why: Business rules for project state transitions
"""

from enum import Enum
from typing import Optional, List
from datetime import datetime


class ProjectStatus(str, Enum):
    """Project lifecycle states"""
    DRAFT = "draft"
    QUEUED = "queued"
    GENERATING = "generating"
    REVIEWING = "reviewing"
    COMPLETE = "complete"
    FAILED = "failed"


class ProjectLifecycle:
    """
    State machine for project lifecycle
    Validates transitions and tracks state
    """
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        ProjectStatus.DRAFT: [ProjectStatus.QUEUED, ProjectStatus.FAILED],
        ProjectStatus.QUEUED: [ProjectStatus.GENERATING, ProjectStatus.FAILED],
        ProjectStatus.GENERATING: [ProjectStatus.REVIEWING, ProjectStatus.FAILED],
        ProjectStatus.REVIEWING: [ProjectStatus.GENERATING, ProjectStatus.COMPLETE, ProjectStatus.FAILED],
        ProjectStatus.COMPLETE: [],  # Terminal state
        ProjectStatus.FAILED: [ProjectStatus.QUEUED]  # Can retry
    }
    
    @staticmethod
    def _coerce(status) -> ProjectStatus:
        """Normalize to this module's ProjectStatus.

        The DB layer (app.models.database.ProjectStatus) is a distinct enum
        class with identical values; members of that class hash differently,
        so dict lookups here silently miss unless coerced by value.
        """
        if isinstance(status, Enum):
            return ProjectStatus(status.value)
        return ProjectStatus(status)

    def __init__(self, current_status: ProjectStatus = ProjectStatus.DRAFT):
        self.current_status = self._coerce(current_status)
        self.history: List[dict] = []
        self._log_transition(None, self.current_status, "Initial state")

    def can_transition_to(self, new_status: ProjectStatus) -> bool:
        """Check if transition is valid"""
        return self._coerce(new_status) in self.VALID_TRANSITIONS.get(self.current_status, [])
    
    def transition_to(self, new_status: ProjectStatus, reason: str = "") -> bool:
        """
        Attempt to transition to new status
        
        Args:
            new_status: Target status
            reason: Reason for transition
            
        Returns:
            True if successful, False if invalid
        """
        new_status = self._coerce(new_status)
        if not self.can_transition_to(new_status):
            return False

        old_status = self.current_status
        self.current_status = new_status
        self._log_transition(old_status, new_status, reason)
        return True
    
    def _log_transition(self, from_status: Optional[ProjectStatus], to_status: ProjectStatus, reason: str):
        """Log state transition"""
        self.history.append({
            "from": from_status.value if from_status else None,
            "to": to_status.value,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def get_progress_percentage(self) -> int:
        """Get progress percentage based on status"""
        progress_map = {
            ProjectStatus.DRAFT: 0,
            ProjectStatus.QUEUED: 10,
            ProjectStatus.GENERATING: 50,
            ProjectStatus.REVIEWING: 80,
            ProjectStatus.COMPLETE: 100,
            ProjectStatus.FAILED: 0
        }
        return progress_map.get(self.current_status, 0)
    
    def is_terminal(self) -> bool:
        """Check if in terminal state"""
        return self.current_status in [ProjectStatus.COMPLETE, ProjectStatus.FAILED]
    
    def is_active(self) -> bool:
        """Check if actively processing"""
        return self.current_status in [ProjectStatus.GENERATING, ProjectStatus.REVIEWING]
    
    def get_phase_description(self) -> str:
        """Get human-readable phase description"""
        descriptions = {
            ProjectStatus.DRAFT: "Configuration in progress",
            ProjectStatus.QUEUED: "Waiting to start",
            ProjectStatus.GENERATING: "Generating specification",
            ProjectStatus.REVIEWING: "Under professor review",
            ProjectStatus.COMPLETE: "Specification complete",
            ProjectStatus.FAILED: "Generation failed"
        }
        return descriptions.get(self.current_status, "Unknown")


def validate_project_config(config: dict) -> List[str]:
    """
    Validate project configuration
    
    Args:
        config: Configuration dict
        
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    # Required fields
    required = ["field_of_study", "academic_level", "effort_level"]
    for field in required:
        if field not in config or not config[field]:
            errors.append(f"Missing required field: {field}")
    
    # Valid values
    if "academic_level" in config:
        if config["academic_level"] not in ["BSc", "MSc", "PhD"]:
            errors.append("academic_level must be BSc, MSc, or PhD")
    
    if "effort_level" in config:
        if config["effort_level"] not in ["low", "medium", "high"]:
            errors.append("effort_level must be low, medium, or high")
    
    # Guidelines file
    if "guidelines_file_path" not in config:
        errors.append("Missing guidelines_file_path")
    
    return errors


def estimate_generation_time(config: dict) -> int:
    """
    Estimate generation time in seconds
    
    Args:
        config: Project configuration
        
    Returns:
        Estimated seconds
    """
    
    base_time = 300  # 5 minutes base
    
    # Add time based on complexity
    if config.get("effort_level") == "high":
        base_time += 180
    elif config.get("effort_level") == "medium":
        base_time += 120
    
    # Add time for iterations
    max_iterations = config.get("max_iterations", 3)
    base_time += max_iterations * 120
    
    # Add time for auto-discovery
    if config.get("past_projects_mode") in ["auto_discover", "hybrid"]:
        base_time += 180
    
    return base_time
