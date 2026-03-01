"""
Phase 0 Agent Definitions — UPDATED
=====================================
File: backend/app/core/agents/definitions/phase0_agents.py

REPLACES the existing phase0_agents.py entirely.
Adds: topic_discovery_agent, topic_advisor_explain_agent,
      topic_advisor_questions_agent, topic_advisor_feasibility_agent,
      topic_advisor_final_agent

Keeps: guidelines_parser_agent, topic_suggester_agent (unchanged — still used
       internally in the spec generation pipeline)
"""

from agents import Agent

# ── Existing models (unchanged) ────────────────────────────────────────────────
from app.models.guidelines import ProjectGuidelines
from pydantic import BaseModel, Field
from typing import List

class TopicSuggestion(BaseModel):
    topic: str = Field(description="The suggested research topic")
    rationale: str = Field(description="Why this topic is suitable")
    available_resources: str = Field(description="Expected datasets/tools available")
    estimated_difficulty: str = Field(description="Low/Medium/High")

class TopicSuggestions(BaseModel):
    suggestions: List[TopicSuggestion] = Field(description="5-7 suggested research topics")

# ── New models (Topic Discovery Engine) ────────────────────────────────────────
from app.models.topic_discovery import TopicDiscoveryOutput, TopicAdvisorOutput

# ── Existing instructions (unchanged) ──────────────────────────────────────────
from app.core.agents.instructions.phase0_guidelines import GUIDELINES_PARSER_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic import TOPIC_SUGGESTER_INSTRUCTIONS

# ── New instructions (Topic Discovery Engine) ───────────────────────────────────
from app.core.agents.instructions.phase0_topic_discovery import TOPIC_DISCOVERY_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic_advisor import (
    TOPIC_ADVISOR_EXPLAIN_INSTRUCTIONS,
    TOPIC_ADVISOR_QUESTIONS_INSTRUCTIONS,
    TOPIC_ADVISOR_FEASIBILITY_INSTRUCTIONS,
    TOPIC_ADVISOR_FINAL_INSTRUCTIONS,
)


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING AGENTS (unchanged — still used in spec generation pipeline)
# ══════════════════════════════════════════════════════════════════════════════

# Guidelines Parser Agent (Cell 4)
guidelines_parser_agent = Agent(
    name="GuidelinesParser",
    instructions=GUIDELINES_PARSER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=ProjectGuidelines,
)

# Topic Suggester Agent (Cell 5) — internal use in spec pipeline only
topic_suggester_agent = Agent(
    name="TopicSuggester",
    instructions=TOPIC_SUGGESTER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicSuggestions,
)


# ══════════════════════════════════════════════════════════════════════════════
# NEW AGENTS — Topic Discovery Engine
# These are SEPARATE from spec generation and serve /topics/* routes only
# ══════════════════════════════════════════════════════════════════════════════

# Stage 1: Generates 12 ranked, clustered topic suggestions from a student profile form
topic_discovery_agent = Agent(
    name="TopicDiscovery",
    instructions=TOPIC_DISCOVERY_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicDiscoveryOutput,
)

# Stage 2a: Explains a selected topic and asks the first feasibility question
topic_advisor_explain_agent = Agent(
    name="TopicAdvisorExplain",
    instructions=TOPIC_ADVISOR_EXPLAIN_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 2b: Continues asking feasibility questions (called repeatedly)
topic_advisor_questions_agent = Agent(
    name="TopicAdvisorQuestions",
    instructions=TOPIC_ADVISOR_QUESTIONS_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 3: Does the full feasibility assessment after all questions are answered
topic_advisor_feasibility_agent = Agent(
    name="TopicAdvisorFeasibility",
    instructions=TOPIC_ADVISOR_FEASIBILITY_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 4: Produces the final structured refined topic output
topic_advisor_final_agent = Agent(
    name="TopicAdvisorFinal",
    instructions=TOPIC_ADVISOR_FINAL_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)
