"""
Phase 3 Agent Definitions

Extracted from: Notebook Cells 15-18
Purpose: Define 8 specialist agents that write specification sections
"""

from agents import Agent
from app.core.agents.instructions.phase3_justification import JUSTIFICATION_AIM_INSTRUCTIONS
from app.core.agents.instructions.phase3_objectives import OBJECTIVES_ARCHITECT_INSTRUCTIONS
from app.core.agents.instructions.phase3_feasibility import FEASIBILITY_ANALYST_INSTRUCTIONS
from app.core.agents.instructions.phase3_literature import LITERATURE_STRATEGIST_INSTRUCTIONS
from app.core.agents.instructions.phase3_methodology import METHODOLOGY_DESIGNER_INSTRUCTIONS
from app.core.agents.instructions.phase3_timeline import TIMELINE_VALIDATOR_INSTRUCTIONS
from app.core.agents.instructions.phase3_references import REFERENCES_COMPILER_INSTRUCTIONS
from app.core.agents.instructions.phase3_abstract import ABSTRACT_SPECIALIST_INSTRUCTIONS


# Justification & Aim Agent (Cell 15)
justification_specialist = Agent(
    name="JustificationSpecialist",
    instructions=JUSTIFICATION_AIM_INSTRUCTIONS,
    model="gpt-4o"
)

# Objectives Agent (Cell 15)
objectives_architect = Agent(
    name="ObjectivesArchitect",
    instructions=OBJECTIVES_ARCHITECT_INSTRUCTIONS,
    model="gpt-4o"
)

# Feasibility Analyst (Cell 16) - uses tools
# Note: Tools (check_timeline_feasibility, validate_resource_access, assess_scope_realism) defined in workflows
feasibility_analyst = Agent(
    name="FeasibilityAnalyst",
    instructions=FEASIBILITY_ANALYST_INSTRUCTIONS,
    model="gpt-4o-mini"
    # tools added dynamically in workflow
)

# Literature Strategist (Cell 16)
literature_strategist = Agent(
    name="LiteratureStrategist",
    instructions=LITERATURE_STRATEGIST_INSTRUCTIONS,
    model="gpt-4o"
)

# Methodology Designer (Cell 17)
methodology_designer = Agent(
    name="MethodologyDesigner",
    instructions=METHODOLOGY_DESIGNER_INSTRUCTIONS,
    model="gpt-4o"
)

# Timeline Validator (Cell 17)
timeline_validator = Agent(
    name="TimelineValidator",
    instructions=TIMELINE_VALIDATOR_INSTRUCTIONS,
    model="gpt-4o"
)

# References Compiler (Cell 18)
references_compiler = Agent(
    name="ReferencesCompiler",
    instructions=REFERENCES_COMPILER_INSTRUCTIONS,
    model="gpt-4o"
)

# Abstract Specialist (Cell 18)
abstract_specialist = Agent(
    name="AbstractSpecialist",
    instructions=ABSTRACT_SPECIALIST_INSTRUCTIONS,
    model="gpt-4o"
)
