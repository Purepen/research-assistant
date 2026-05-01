"""
Phase 2 Agent Definitions

TRACK B ADDITION:
  theoretical_synthesizer_b_agent — uses TheoreticalSynthesisB as output_type
  and THEORETICAL_SYNTHESIZER_B_INSTRUCTIONS as its instruction set.
  Used exclusively when detect_track() returns "B".

  strategic_synthesizer_agent — UNCHANGED. Track A only.

MODEL TIER ADDITION (Apr 2026):
  build_phase2_agents(config) factory function added below the module-level
  definitions. The pipeline calls this factory when a user's AgentModelConfig
  is available, instead of using the module-level singletons.

  The module-level singletons are kept unchanged for backward compatibility —
  any code that still imports them directly will continue to work.
"""

from agents import Agent
from app.models.synthesis import StrategicSynthesis, TheoreticalSynthesisB
from app.core.agents.instructions.phase2_synthesis import (
    STRATEGIC_SYNTHESIZER_INSTRUCTIONS,
    THEORETICAL_SYNTHESIZER_B_INSTRUCTIONS,
)


# ── Track A: Strategic Synthesizer — UNCHANGED ────────────────────────────────
strategic_synthesizer_agent = Agent(
    name="StrategicSynthesizer",
    instructions=STRATEGIC_SYNTHESIZER_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=StrategicSynthesis,
)


# ── Track B: Theoretical Synthesizer — UNCHANGED ─────────────────────────────
theoretical_synthesizer_b_agent = Agent(
    name="TheoreticalSynthesizerB",
    instructions=THEORETICAL_SYNTHESIZER_B_INSTRUCTIONS,
    model="gpt-4o-mini",
    output_type=TheoreticalSynthesisB,
)


# ── Factory function — model-tier-aware ───────────────────────────────────────

def build_phase2_agents(config: "AgentModelConfig") -> dict:  # type: ignore[name-defined]
    """
    Build Phase 2 synthesis agents using the user's AgentModelConfig.

    Called by the pipeline when a per-user model config is available.
    Returns a dict keyed by role name so callers can replace the module-level
    singletons cleanly without positional coupling.

    Usage in phase2_workflow.py:
        from app.core.agents.definitions.phase2_agents import build_phase2_agents
        agents = build_phase2_agents(agent_model_config)
        strategic_synthesizer    = agents["strategic_synthesizer"]
        theoretical_synthesizer  = agents["theoretical_synthesizer"]
    """
    from app.models.agent_config import AgentKey

    return {
        "strategic_synthesizer": Agent(
            name="StrategicSynthesizer",
            instructions=STRATEGIC_SYNTHESIZER_INSTRUCTIONS,
            model=config.get(AgentKey.STRATEGIC_SYNTHESIZER),
            output_type=StrategicSynthesis,
        ),
        "theoretical_synthesizer": Agent(
            name="TheoreticalSynthesizerB",
            instructions=THEORETICAL_SYNTHESIZER_B_INSTRUCTIONS,
            model=config.get(AgentKey.THEORETICAL_SYNTHESIZER),
            output_type=TheoreticalSynthesisB,
        ),
    }