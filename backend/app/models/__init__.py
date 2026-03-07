"""
Pydantic Models Package — UPDATED v2

Added: locked_requirements module exports
"""

from .config import SpecificationConfig, DEFAULT_CONFIG
from .guidelines import SectionRequirement, ProjectGuidelines
from .resources import (
    DiscoveredDataset,
    DiscoveredMethod,
    DiscoveredTool,
    DiscoveredPaper,
    DiscoveredResources,
)
from .synthesis import (
    ProjectGap,
    StrategicDifferentiationPoint,
    NovelContributionClaim,
    StrategicSynthesis,
)
from .specification import SpecificationSection, ProjectSpecification
from .review import SectionReview, OverallReview
from .projects import (
    ProjectDatasetDetails,
    ProjectMethodologyDetails,
    AnalyzedProjectSpecSections,
)
from .locked_requirements import (
    VerifiedPaper,
    LockedDataset,
    LockedBaseline,
    SimilarProjectEntry,
    EvaluationFramework,
    EthicsStatement,
    LockedRequirementsA,
    LockedRequirementsB,
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
    # Locked Requirements (NEW)
    "VerifiedPaper",
    "LockedDataset",
    "LockedBaseline",
    "SimilarProjectEntry",
    "EvaluationFramework",
    "EthicsStatement",
    "LockedRequirementsA",
    "LockedRequirementsB",
]
