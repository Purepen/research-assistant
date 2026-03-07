"""
Phase 4 Agent Definitions

Extracted from: Notebook Cell 19
Purpose: Define orchestrator and formatter agents
"""

from agents import Agent
from app.models.specification import ProjectSpecification
from app.core.agents.instructions.phase4_orchestrator import ORCHESTRATOR_INSTRUCTIONS
from app.core.agents.instructions.phase4_formatter import FORMATTER_INSTRUCTIONS


# Specification Orchestrator (Cell 19)
specification_orchestrator = Agent(
    name="SpecificationOrchestrator",
    instructions=ORCHESTRATOR_INSTRUCTIONS,
    model="gpt-4o"
)

# Specification Formatter (Cell 19)
specification_formatter = Agent(
    name="SpecificationFormatter",
    instructions=FORMATTER_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=ProjectSpecification
)
