"""
Phase 2 Agent Definitions

Extracted from: Notebook Cell 8
Purpose: Define agent for strategic synthesis
"""

from agents import Agent
from app.models.synthesis import StrategicSynthesis
from app.core.agents.instructions.phase2_synthesis import STRATEGIC_SYNTHESIZER_INSTRUCTIONS


# Strategic Synthesizer Agent (Cell 8)
strategic_synthesizer_agent = Agent(
    name="StrategicSynthesizer",
    instructions=STRATEGIC_SYNTHESIZER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=StrategicSynthesis
)
