"""
Phase 0 Agent Definitions

Extracted from: Notebook Cells 4-5
Purpose: Define agents for guidelines parsing and topic suggestion
"""

from agents import Agent
from app.models.guidelines import ProjectGuidelines
from app.core.agents.instructions.phase0_guidelines import GUIDELINES_PARSER_INSTRUCTIONS
from app.core.agents.instructions.phase0_topic import TOPIC_SUGGESTER_INSTRUCTIONS


# Guidelines Parser Agent (Cell 4)
guidelines_parser_agent = Agent(
    name="GuidelinesParser",
    instructions=GUIDELINES_PARSER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=ProjectGuidelines
)


# Topic Suggester Agent (Cell 5)
# Note: TopicSuggestions model defined inline in notebook
from pydantic import BaseModel, Field
from typing import List

class TopicSuggestion(BaseModel):
    topic: str = Field(description="The suggested research topic")
    rationale: str = Field(description="Why this topic is suitable")
    available_resources: str = Field(description="Expected datasets/tools available")
    estimated_difficulty: str = Field(description="Low/Medium/High")

class TopicSuggestions(BaseModel):
    suggestions: List[TopicSuggestion] = Field(
        description="5-7 suggested research topics"
    )

topic_suggester_agent = Agent(
    name="TopicSuggester",
    instructions=TOPIC_SUGGESTER_INSTRUCTIONS,
    model="gpt-4o",
    output_type=TopicSuggestions
)
