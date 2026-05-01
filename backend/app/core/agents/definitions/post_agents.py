"""
Post-Assembly Agent Definitions
================================
File: backend/app/core/agents/definitions/post_agents.py

Two agents that run after the specification is assembled and reviewed:

  1. critic_agent       — brutal gap analysis, section by section
  2. human_writer_agent — rewrites the full spec in natural human voice,
                          removing all AI writing patterns and em-dashes

Pipeline position:
  Phase 4 (formatter) → Phase 5 (professor reviewer)
        → critic_agent → human_writer_agent → Phase 6 (email/delivery)

Module-level singletons are kept for backward compatibility.
Use build_post_agents(config) when a per-user AgentModelConfig is available.
"""

from agents import Agent
from app.core.agents.instructions.critic_instructions      import CRITIC_AGENT_INSTRUCTIONS
from app.core.agents.instructions.human_writer_instructions import HUMAN_WRITER_INSTRUCTIONS


# ── Module-level singletons — for direct import compatibility ─────────────────

critic_agent = Agent(
    name="CriticAgent",
    instructions=CRITIC_AGENT_INSTRUCTIONS,
    model="gpt-4o",   # needs strong reasoning to identify real gaps
)

human_writer_agent = Agent(
    name="HumanWriterAgent",
    instructions=HUMAN_WRITER_INSTRUCTIONS,
    model="gpt-4o",   # needs strong instruction-following for style rules
)


# ── Factory function — model-tier-aware ───────────────────────────────────────

def build_post_agents(config: "AgentModelConfig") -> dict:  # type: ignore[name-defined]
    """
    Build post-assembly agents using the user's AgentModelConfig.

    Called by the pipeline when a per-user model config is available.
    Returns a dict keyed by role name.

    Usage in main_orchestrator.py or phase5_workflow.py:
        from app.core.agents.definitions.post_agents import build_post_agents
        agents = build_post_agents(agent_model_config)
        critic       = agents["critic"]
        human_writer = agents["human_writer"]
    """
    from app.models.agent_config import AgentKey

    return {
        "critic": Agent(
            name="CriticAgent",
            instructions=CRITIC_AGENT_INSTRUCTIONS,
            model=config.get(AgentKey.CRITIC_AGENT),
        ),
        "human_writer": Agent(
            name="HumanWriterAgent",
            instructions=HUMAN_WRITER_INSTRUCTIONS,
            model=config.get(AgentKey.HUMAN_WRITER_AGENT),
        ),
    }