"""
Phase 0 Agent Definitions — v4 UPDATE
========================================
File: backend/app/core/agents/definitions/phase0_agents.py

CHANGES:
- Added topic_project_scout_agent (WebSearchTool — finds similar student projects)
- topic_data_scout_agent and topic_project_scout_agent use TopicAdvisorOutput
  (plain message field) since they return free-form JSON that we parse manually
- All other agents unchanged
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

from app.core.agents.instructions.phase0_guidelines import GUIDELINES_PARSER_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic import TOPIC_SUGGESTER_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic_discovery import TOPIC_DISCOVERY_INSTRUCTIONS
from app.core.agents.instructions.phase0_data_scout import TOPIC_DATA_SCOUT_INSTRUCTIONS
from app.core.agents.instructions.phase0_project_scout import TOPIC_PROJECT_SCOUT_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic_advisor import (
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

# Stage 1: Generate 12 ranked topics
topic_discovery_agent = Agent(
    name="TopicDiscovery",
    instructions=TOPIC_DISCOVERY_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicDiscoveryOutput,
)

# Stage 1.5: Search for datasets/papers/tools (uses WebSearchTool)
# Returns free-form JSON via message field — parsed manually in pipeline
topic_data_scout_agent = Agent(
    name="TopicDataScout",
    instructions=TOPIC_DATA_SCOUT_INSTRUCTIONS,
    model="gpt-4o",
    tools=[WebSearchTool()],
    output_type=TopicAdvisorOutput,  # message field carries the JSON
)

# Post-final: Find 2 similar student projects (uses WebSearchTool)
topic_project_scout_agent = Agent(
    name="TopicProjectScout",
    instructions=TOPIC_PROJECT_SCOUT_INSTRUCTIONS,
    model="gpt-4o",
    tools=[WebSearchTool()],
    output_type=TopicAdvisorOutput,  # message field carries the JSON
)

# Stage 2a: Explain + present data found
topic_advisor_explain_agent = Agent(
    name="TopicAdvisorExplain",
    instructions=TOPIC_ADVISOR_EXPLAIN_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 2b: Feasibility questions
topic_advisor_questions_agent = Agent(
    name="TopicAdvisorQuestions",
    instructions=TOPIC_ADVISOR_QUESTIONS_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 3: Feasibility assessment
topic_advisor_feasibility_agent = Agent(
    name="TopicAdvisorFeasibility",
    instructions=TOPIC_ADVISOR_FEASIBILITY_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)

# Stage 4: Final refined topic
topic_advisor_final_agent = Agent(
    name="TopicAdvisorFinal",
    instructions=TOPIC_ADVISOR_FINAL_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicAdvisorOutput,
)
