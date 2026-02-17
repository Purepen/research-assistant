"""
Agent Instructions Package

All agent instruction strings extracted from notebook cells 4-22.
These are the carefully crafted prompts that define agent behavior.
"""

# Phase 0: Setup
from .phase0_guidelines import GUIDELINES_PARSER_INSTRUCTIONS
from .phase0_topic import TOPIC_SUGGESTER_INSTRUCTIONS

# Phase 1: Resource Discovery
from .phase1_resource_discovery import RESOURCE_FINDER_INSTRUCTIONS
from .phase1_project_finder import PROJECT_FINDER_INSTRUCTIONS
from .phase1_project_analyzer import PROJECT_ANALYZER_INSTRUCTIONS
from .phase1_past_projects import PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS

# Phase 2: Strategic Synthesis
from .phase2_synthesis import STRATEGIC_SYNTHESIZER_INSTRUCTIONS

# Phase 3: Specification Sections
from .phase3_justification import JUSTIFICATION_AIM_INSTRUCTIONS
from .phase3_objectives import OBJECTIVES_ARCHITECT_INSTRUCTIONS
from .phase3_feasibility import FEASIBILITY_ANALYST_INSTRUCTIONS
from .phase3_literature import LITERATURE_STRATEGIST_INSTRUCTIONS
from .phase3_methodology import METHODOLOGY_DESIGNER_INSTRUCTIONS
from .phase3_timeline import TIMELINE_VALIDATOR_INSTRUCTIONS
from .phase3_references import REFERENCES_COMPILER_INSTRUCTIONS
from .phase3_abstract import ABSTRACT_SPECIALIST_INSTRUCTIONS

# Phase 4: Orchestration
from .phase4_orchestrator import ORCHESTRATOR_INSTRUCTIONS
from .phase4_formatter import FORMATTER_INSTRUCTIONS

# Phase 5: Review
from .phase5_reviewer import PROFESSOR_REVIEWER_INSTRUCTIONS

# Phase 6: Email
from .phase6_email import EMAIL_AGENT_INSTRUCTIONS

__all__ = [
    # Phase 0
    "GUIDELINES_PARSER_INSTRUCTIONS",
    "TOPIC_SUGGESTER_INSTRUCTIONS",
    # Phase 1
    "RESOURCE_FINDER_INSTRUCTIONS",
    "PROJECT_FINDER_INSTRUCTIONS",
    "PROJECT_ANALYZER_INSTRUCTIONS",
    "PAST_PROJECTS_SPEC_ANALYZER_INSTRUCTIONS",
    # Phase 2
    "STRATEGIC_SYNTHESIZER_INSTRUCTIONS",
    # Phase 3
    "JUSTIFICATION_AIM_INSTRUCTIONS",
    "OBJECTIVES_ARCHITECT_INSTRUCTIONS",
    "FEASIBILITY_ANALYST_INSTRUCTIONS",
    "LITERATURE_STRATEGIST_INSTRUCTIONS",
    "METHODOLOGY_DESIGNER_INSTRUCTIONS",
    "TIMELINE_VALIDATOR_INSTRUCTIONS",
    "REFERENCES_COMPILER_INSTRUCTIONS",
    "ABSTRACT_SPECIALIST_INSTRUCTIONS",
    # Phase 4
    "ORCHESTRATOR_INSTRUCTIONS",
    "FORMATTER_INSTRUCTIONS",
    # Phase 5
    "PROFESSOR_REVIEWER_INSTRUCTIONS",
    # Phase 6
    "EMAIL_AGENT_INSTRUCTIONS",
]
