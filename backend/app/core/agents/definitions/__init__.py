"""
Agent Definitions Package

All agent instantiations extracted from notebook cells 4-22.
These define how agents are configured with instructions, models, and tools.
"""



# Topic Discovery Engine (new — separate from spec generation pipeline)
from .phase0_agents import (
    topic_discovery_agent,
    topic_advisor_explain_agent,
    topic_advisor_questions_agent,
    topic_advisor_feasibility_agent,
    topic_advisor_final_agent,
)

# Phase 1
from .phase1_agents import (
    resource_finder_agent,
    web_search_agent,
    project_finder_agent,
    project_analyzer_agent,
    past_projects_spec_analyzer_agent
)

# Phase 2
from .phase2_agents import strategic_synthesizer_agent

# Phase 3
from .phase3_agents import (
    justification_specialist,
    objectives_architect,
    feasibility_analyst,
    literature_strategist,
    methodology_designer,
    timeline_validator,
    references_compiler,
    abstract_specialist
)

# Phase 4
from .phase4_agents import (
    specification_orchestrator,
    specification_formatter
)

# Phase 5
from .phase5_agents import professor_reviewer_agent

# Phase 6
from .phase6_agents import email_agent

__all__ = [
    # # Phase 0
    # "guidelines_parser_agent",
    # "topic_suggester_agent",

    #Phase 0
    "topic_discovery_agent",
    "topic_advisor_explain_agent",
    "topic_advisor_questions_agent",
    "topic_advisor_feasibility_agent",
    "topic_advisor_final_agent",
    # Phase 1
    "resource_finder_agent",
    "web_search_agent",
    "project_finder_agent",
    "project_analyzer_agent",
    "past_projects_spec_analyzer_agent",
    # Phase 2
    "strategic_synthesizer_agent",
    # Phase 3
    "justification_specialist",
    "objectives_architect",
    "feasibility_analyst",
    "literature_strategist",
    "methodology_designer",
    "timeline_validator",
    "references_compiler",
    "abstract_specialist",
    # Phase 4
    "specification_orchestrator",
    "specification_formatter",
    # Phase 5
    "professor_reviewer_agent",
    # Phase 6
    "email_agent",
]
