"""
Pydantic Models Package

All data models extracted from notebook cells 1-3.
These define the structure of data throughout the system.
"""

from .config import SpecificationConfig, DEFAULT_CONFIG
from .guidelines import SectionRequirement, ProjectGuidelines
from .resources import (
    DiscoveredDataset,
    DiscoveredMethod,
    DiscoveredTool,
    DiscoveredPaper,
    DiscoveredResources
)
from .synthesis import (
    ProjectGap,
    StrategicDifferentiationPoint,
    NovelContributionClaim,
    StrategicSynthesis
)
from .specification import SpecificationSection, ProjectSpecification
from .review import SectionReview, OverallReview
from .projects import (
    ProjectDatasetDetails,
    ProjectMethodologyDetails,
    AnalyzedProjectSpecSections
)

__all__ = [
    # Config
    "SpecificationConfig",
    "DEFAULT_CONFIG",
    # Guidelines
    "SectionRequirement",
    "ProjectGuidelines",
    # Resources
    "DiscoveredDataset",
    "DiscoveredMethod",
    "DiscoveredTool",
    "DiscoveredPaper",
    "DiscoveredResources",
    # Synthesis
    "ProjectGap",
    "StrategicDifferentiationPoint",
    "NovelContributionClaim",
    "StrategicSynthesis",
    # Specification
    "SpecificationSection",
    "ProjectSpecification",
    # Review
    "SectionReview",
    "OverallReview",
    # Projects
    "ProjectDatasetDetails",
    "ProjectMethodologyDetails",
    "AnalyzedProjectSpecSections",
]
