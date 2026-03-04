"""
Phase 0 Agent Definitions — v5 (Phase 2 Vetter Addition)
==========================================================
File: backend/app/core/agents/definitions/phase0_agents.py

CHANGES from v4:
  - Added topic_vetter_agent — handles the "I already have a topic" path.
    Runs a one-shot evaluation and returns STRONG / REFINED / PIVOTED verdict.
    No WebSearchTool — pure LLM reasoning against the student's context.

All other agents unchanged.
"""

from agents import Agent, WebSearchTool
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

from app.models.topic_discovery import TopicDiscoveryOutput, TopicAdvisorOutput

from app.core.agents.instructions.phase0_guidelines      import GUIDELINES_PARSER_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic           import TOPIC_SUGGESTER_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic_discovery import TOPIC_DISCOVERY_INSTRUCTIONS
from app.core.agents.instructions.phase0_data_scout      import TOPIC_DATA_SCOUT_INSTRUCTIONS
from app.core.agents.instructions.phase0_project_scout   import TOPIC_PROJECT_SCOUT_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic_vetter    import TOPIC_VETTER_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic_advisor   import (
    TOPIC_ADVISOR_EXPLAIN_INSTRUCTIONS,
    TOPIC_ADVISOR_QUESTIONS_INSTRUCTIONS,
    TOPIC_ADVISOR_FEASIBILITY_INSTRUCTIONS,
    TOPIC_ADVISOR_FINAL_INSTRUCTIONS,
)


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING AGENTS (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

guidelines_parser_agent = Agent(
    name="GuidelinesParser",
    instructions=GUIDELINES_PARSER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=ProjectGuidelines,
)

topic_suggester_agent = Agent(
    name="TopicSuggester",
    instructions=TOPIC_SUGGESTER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicSuggestions,
)


# ══════════════════════════════════════════════════════════════════════════════
# TOPIC DISCOVERY ENGINE AGENTS
# ══════════════════════════════════════════════════════════════════════════════

# Stage 1: Generate 12 ranked topics from student profile
topic_discovery_agent = Agent(
    name="TopicDiscovery",
    instructions=TOPIC_DISCOVERY_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicDiscoveryOutput,
)

# Stage 1.5: Search for datasets / papers / tools (uses WebSearchTool)
# Returns free-form JSON via message field — parsed manually in workflow
topic_data_scout_agent = Agent(
    name="TopicDataScout",
    instructions=TOPIC_DATA_SCOUT_INSTRUCTIONS,
    model="gpt-4o",
    tools=[WebSearchTool()],
    output_type=TopicAdvisorOutput,   # message field carries the JSON
)

# Post-final: Find 2 similar real student projects (uses WebSearchTool)
topic_project_scout_agent = Agent(
    name="TopicProjectScout",
    instructions=TOPIC_PROJECT_SCOUT_INSTRUCTIONS,
    model="gpt-4o",
    tools=[WebSearchTool()],
    output_type=TopicAdvisorOutput,   # message field carries the JSON
)

# ── NEW: Topic Vetter ─────────────────────────────────────────────────────────
# "I already have a topic" path.
# One-shot evaluation — no web search needed.
# Returns structured plain-text that parse_vet_result() extracts in workflow.
topic_vetter_agent = Agent(
    name="TopicVetter",
    instructions=TOPIC_VETTER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,   # message field carries the structured plain-text
)

# ── Advisor conversation agents ───────────────────────────────────────────────

# Stage 2a: Explain the topic + present scout data + ask first question
topic_advisor_explain_agent = Agent(
    name="TopicAdvisorExplain",
    instructions=TOPIC_ADVISOR_EXPLAIN_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 2b: Feasibility questions (iterates up to ~4 rounds)
topic_advisor_questions_agent = Agent(
    name="TopicAdvisorQuestions",
    instructions=TOPIC_ADVISOR_QUESTIONS_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 3: Holistic feasibility assessment
topic_advisor_feasibility_agent = Agent(
    name="TopicAdvisorFeasibility",
    instructions=TOPIC_ADVISOR_FEASIBILITY_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 4: Final confirmed topic output (FINAL TOPIC TITLE: / DESCRIPTION: / etc.)
topic_advisor_final_agent = Agent(
    name="TopicAdvisorFinal",
    instructions=TOPIC_ADVISOR_FINAL_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)
