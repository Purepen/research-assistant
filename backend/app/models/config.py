"""
Configuration Model

Extracted from: Notebook Cell 1
Purpose: System configuration - controls complexity, timeline, and behavior
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal


class SpecificationConfig(BaseModel):
    """
    Configuration for the specification generation system
    Controls complexity, timeline, and system behavior
    """
    
    # Student context
    field_of_study: str = Field(
        description="Student's field of study (e.g., 'Computer Science - Machine Learning')"
    )
    
    research_topic: Optional[str] = Field(
        default=None,
        description="Research topic - if None, system will suggest topics"
    )
    
    # Academic parameters
    academic_level: Literal["BSc", "MSc", "PhD"] = Field(
        default="MSc",
        description="Academic level - affects expectations and complexity"
    )
    
    effort_level: Literal["low", "medium", "high"] = Field(
        default="medium",
        description="""
        Student's effort/ambition level:
        - low: Safe, use existing resources, minimal novelty, maximum feasibility
        - medium: Some novelty, minor improvements, balanced approach
        - high: Novel contributions, ambitious scope, cutting-edge methods
        """
    )
    
    # Auto-discovery configuration
    past_projects_mode: Literal["user_provided", "auto_discover", "hybrid"] = Field(
        default="hybrid",
        description="""
        How to handle past project research:
        - user_provided: Only analyze user-provided dump files (if empty, skip project analysis)
        - auto_discover: Ignore user dumps, only use autonomous project discovery
        - hybrid: Use BOTH user dumps AND auto-discover projects (RECOMMENDED)
        """
    )

    num_auto_projects_target: int = Field(
        default=3,
        ge=1,
        le=5,
        description="TARGET number of projects to auto-discover (will attempt to find this many)"
    )

    min_auto_projects_required: int = Field(
        default=1,
        ge=0,
        le=5,
        description="MINIMUM acceptable auto-discovered projects (if fewer found, system still proceeds). Must be <= num_auto_projects_target"
    )

    max_auto_projects_accepted: int = Field(
        default=3,
        ge=1,
        le=10,
        description="MAXIMUM auto-discovered projects to keep (if more found, keep best N). Must be >= num_auto_projects_target"
    )

    deduplicate_auto_vs_user: bool = Field(
        default=True,
        description="If True, remove auto-discovered projects that match user-provided dumps. If False, keep all."
    )
    
    # System parameters
    max_iterations: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum review/revision iterations"
    )
    
    max_chars_per_project: int = Field(
        default=20000,
        ge=5000,
        le=50000,
        description="Maximum characters per past project document (for truncation)"
    )
    
    num_web_searches: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Number of web searches for resource discovery"
    )
    
    # Email notification
    notification_email: Optional[str] = Field(
        default=None,
        description="Email address for final specification delivery"
    )
    
    def __str__(self):
        return f"""Configuration:
    Field: {self.field_of_study}
    Topic: {self.research_topic or 'To be suggested'}
    Level: {self.academic_level}
    Effort: {self.effort_level}
    Past projects mode: {self.past_projects_mode}
    Auto-discover: target={self.num_auto_projects_target}, min={self.min_auto_projects_required}, max={self.max_auto_projects_accepted}
    Deduplication: {'enabled' if self.deduplicate_auto_vs_user else 'disabled'}
    Web searches: {self.num_web_searches}
    Max iterations: {self.max_iterations}"""


# Default configuration
DEFAULT_CONFIG = SpecificationConfig(
    field_of_study="Computer Science - Machine Learning",
    academic_level="MSc",
    effort_level="medium",
    past_projects_mode="hybrid",
    num_auto_projects_target=3,      # Try to find 3
    min_auto_projects_required=1,    # Need at least 1
    max_auto_projects_accepted=3,    # Keep max 3
    deduplicate_auto_vs_user=True,   # Remove duplicates
    num_web_searches=5,               # Still do 5 web searches
    max_iterations=3
)
