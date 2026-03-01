"""
Topic Discovery Models
======================
File: backend/app/models/topic_discovery.py
Purpose: Pydantic output models for the Topic Discovery Engine agents.
         Follows the same pattern as guidelines.py, resources.py, review.py, etc.
"""

from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ─── Stage 1 Output: Topic Discovery ──────────────────────────────────────────

class DiscoveredTopic(BaseModel):
    """A single ranked topic suggestion from the TopicDiscovery agent."""

    id: str = Field(
        description="Short slug identifier e.g. 'health-ml-01'"
    )
    title: str = Field(
        description="Clear, specific research topic title"
    )
    cluster: str = Field(
        description="Thematic cluster this topic belongs to"
    )
    complexity: Literal["Low", "Medium", "High"] = Field(
        description="Complexity level relative to the student's degree level"
    )
    research_depth: Literal["Light", "Moderate", "Deep"] = Field(
        description="Depth of academic research required"
    )
    implementation: Literal["Theoretical", "Mixed", "Hands-on"] = Field(
        description="Nature of the practical work involved"
    )
    suitability_score: int = Field(
        ge=1, le=100,
        description="How well this topic matches the student's specific profile (1-100)"
    )
    suitability_reason: str = Field(
        description="One sentence explaining why this topic suits this specific student"
    )
    one_liner: str = Field(
        description="Plain English summary of what the project does (max 20 words)"
    )


class TopicDiscoveryOutput(BaseModel):
    """
    Complete output from the TopicDiscovery agent.
    Contains all 12 ranked topic suggestions grouped into clusters.
    """

    prompt_note: str = Field(
        description="1-2 sentences personalised to the student explaining the suggestions"
    )
    clusters: List[str] = Field(
        description="Ordered list of thematic cluster names"
    )
    topics: List[DiscoveredTopic] = Field(
        description="All 12 topic suggestions sorted by suitability score descending"
    )


# ─── Stage 2-4 Output: Topic Advisor ──────────────────────────────────────────

class TopicAdvisorOutput(BaseModel):
    """
    Output from any stage of the TopicAdvisor agent (explain / questions / feasibility / final).
    The route layer interprets this based on the current stage.
    """

    message: str = Field(
        description="The AI advisor's response to the student"
    )


class FinalTopicOutput(BaseModel):
    """
    Structured output from the TopicAdvisor agent on the 'final' stage.
    Parsed from the formatted response by the pipeline.
    """

    suggested_title: str = Field(
        description="Final polished research topic title"
    )
    description: str = Field(
        description="Two-paragraph project description"
    )
    next_steps: List[str] = Field(
        description="3 concrete next steps for the student"
    )
    ready_message: str = Field(
        description="Closing encouragement message"
    )
