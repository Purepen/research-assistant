"""
Phase 3 Agent Definitions — UPDATED

All agents now import from redesigned instruction files.
Every agent is plain text output — formatting into ProjectSpecification
is handled by phase4 formatter after phase3 sections are assembled.
"""

from agents import Agent
from app.core.agents.instructions.phase3_justification  import JUSTIFICATION_AIM_INSTRUCTIONS
from app.core.agents.instructions.phase3_objectives     import OBJECTIVES_ARCHITECT_INSTRUCTIONS
from app.core.agents.instructions.phase3_literature     import LITERATURE_STRATEGIST_INSTRUCTIONS
from app.core.agents.instructions.phase3_methodology    import METHODOLOGY_DESIGNER_INSTRUCTIONS
from app.core.agents.instructions.phase3_timeline       import TIMELINE_VALIDATOR_INSTRUCTIONS
from app.core.agents.instructions.phase3_references     import REFERENCES_COMPILER_INSTRUCTIONS
from app.core.agents.instructions.phase3_abstract       import ABSTRACT_SPECIALIST_INSTRUCTIONS


# ── Section writers — all plain-text output ───────────────────────────────────everything gpt-4o except the last
# These agents receive a focused locked-context prompt and return prose.
# The formatter in phase4 assembles them into a ProjectSpecification object.

justification_specialist = Agent(
    name="JustificationSpecialist",
    instructions=JUSTIFICATION_AIM_INSTRUCTIONS,
    model="gpt-4o-mini",
)

objectives_architect = Agent(
    name="ObjectivesArchitect",
    instructions=OBJECTIVES_ARCHITECT_INSTRUCTIONS,
    model="gpt-4o-mini",
)

literature_strategist = Agent(
    name="LiteratureStrategist",
    instructions=LITERATURE_STRATEGIST_INSTRUCTIONS,
    model="gpt-4o-mini",
)

methodology_designer = Agent(
    name="MethodologyDesigner",
    instructions=METHODOLOGY_DESIGNER_INSTRUCTIONS,
    model="gpt-4o-mini",
)

timeline_validator = Agent(
    name="TimelineValidator",
    instructions=TIMELINE_VALIDATOR_INSTRUCTIONS,
    model="gpt-4o-mini",
)

references_compiler = Agent(
    name="ReferencesCompiler",
    instructions=REFERENCES_COMPILER_INSTRUCTIONS,
    model="gpt-4o-mini",
)

abstract_specialist = Agent(
    name="AbstractSpecialist",
    instructions=ABSTRACT_SPECIALIST_INSTRUCTIONS,
    model="gpt-4o-mini",
)

# ── Kept for backwards compatibility (feasibility analyst still imported elsewhere) ──gpt-4o-mini
from app.core.agents.instructions.phase3_feasibility import FEASIBILITY_ANALYST_INSTRUCTIONS  # type: ignore

feasibility_analyst = Agent(
    name="FeasibilityAnalyst",
    instructions=FEASIBILITY_ANALYST_INSTRUCTIONS,
    model="gpt-4o-mini",
)


# ── Factory function — model-tier-aware ───────────────────────────────────────

def build_phase3_agents(config: "AgentModelConfig") -> dict:  # type: ignore[name-defined]
    """
    Build Phase 3 section-writer agents using the user's AgentModelConfig.

    Called by the pipeline when a per-user model config is available.
    Returns a dict keyed by role name — the same keys generate_specification_sections()
    in phase3_workflow.py uses for the module-level singletons.
    """
    from app.models.agent_config import AgentKey

    return {
        "justification_specialist": Agent(
            name="JustificationSpecialist",
            instructions=JUSTIFICATION_AIM_INSTRUCTIONS,
            model=config.get(AgentKey.JUSTIFICATION_SPECIALIST),
        ),
        "objectives_architect": Agent(
            name="ObjectivesArchitect",
            instructions=OBJECTIVES_ARCHITECT_INSTRUCTIONS,
            model=config.get(AgentKey.OBJECTIVES_ARCHITECT),
        ),
        "literature_strategist": Agent(
            name="LiteratureStrategist",
            instructions=LITERATURE_STRATEGIST_INSTRUCTIONS,
            model=config.get(AgentKey.LITERATURE_STRATEGIST),
        ),
        "methodology_designer": Agent(
            name="MethodologyDesigner",
            instructions=METHODOLOGY_DESIGNER_INSTRUCTIONS,
            model=config.get(AgentKey.METHODOLOGY_DESIGNER),
        ),
        "timeline_validator": Agent(
            name="TimelineValidator",
            instructions=TIMELINE_VALIDATOR_INSTRUCTIONS,
            model=config.get(AgentKey.TIMELINE_VALIDATOR),
        ),
        "references_compiler": Agent(
            name="ReferencesCompiler",
            instructions=REFERENCES_COMPILER_INSTRUCTIONS,
            model=config.get(AgentKey.REFERENCES_COMPILER),
        ),
        "abstract_specialist": Agent(
            name="AbstractSpecialist",
            instructions=ABSTRACT_SPECIALIST_INSTRUCTIONS,
            model=config.get(AgentKey.ABSTRACT_SPECIALIST),
        ),
    }
