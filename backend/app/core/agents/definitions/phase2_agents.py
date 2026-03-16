"""
Phase 2 Agent Definitions

TRACK B ADDITION:
  theoretical_synthesizer_b_agent — uses TheoreticalSynthesisB as output_type
  and THEORETICAL_SYNTHESIZER_B_INSTRUCTIONS as its instruction set.
  Used exclusively when detect_track() returns "B".

  strategic_synthesizer_agent — UNCHANGED. Track A only.
"""

from agents import Agent
from app.models.synthesis import StrategicSynthesis, TheoreticalSynthesisB
from app.core.agents.instructions.phase2_synthesis import (
    STRATEGIC_SYNTHESIZER_INSTRUCTIONS,
    THEORETICAL_SYNTHESIZER_B_INSTRUCTIONS,
)


# ── Track A: Strategic Synthesizer — UNCHANGED ──────────────gpt 4o─────────────────
strategic_synthesizer_agent = Agent(
    name="StrategicSynthesizer",
    instructions=STRATEGIC_SYNTHESIZER_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=StrategicSynthesis,
)


# ── Track B: Theoretical Synthesizer — NEW ─────────────────────gpt 4o──────────────
# Produces TheoreticalSynthesisB with humanities-native fields:
# scholarly_debates, key_theoretical_frameworks, key_scholars,
# analytical_approaches, primary_source_suggestions, research_gaps.
# These feed directly into locked_requirements_builder.py Track B assembly.
theoretical_synthesizer_b_agent = Agent(
    name="TheoreticalSynthesizerB",
    instructions=THEORETICAL_SYNTHESIZER_B_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=TheoreticalSynthesisB,
)