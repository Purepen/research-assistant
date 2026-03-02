"""
Topic Discovery Models — v4 UPDATE
=====================================
File: backend/app/models/topic_discovery.py

CHANGES:
- TopicScoutOutput now has structured fields (datasets with URLs, papers with URLs, etc.)
- Added SimilarProject and ProjectScoutOutput for the project finder
- All other models unchanged
"""

from __future__ import annotations
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ─── Stage 1 Output: Topic Discovery ──────────────────────────────────────────

class DiscoveredTopic(BaseModel):
    id: str
    title: str
    cluster: str
    complexity: Literal["Low", "Medium", "High"]
    research_depth: Literal["Light", "Moderate", "Deep"]
    implementation: Literal["Theoretical", "Mixed", "Hands-on"]
    suitability_score: int = Field(ge=1, le=100)
    suitability_reason: str
    one_liner: str


class TopicDiscoveryOutput(BaseModel):
    prompt_note: str
    clusters: List[str]
    topics: List[DiscoveredTopic]


# ─── Scout Resource Sub-models ────────────────────────────────────────────────

class ScoutDataset(BaseModel):
    name: str
    description: str
    source: str
    url: str
    access: str = "Free"


class ScoutPaper(BaseModel):
    title: str
    year: str
    relevance: str
    url: str


class ScoutTool(BaseModel):
    name: str
    description: str
    url: str


class ScoutKeyAuthor(BaseModel):
    name: str
    institution: str
    contribution: str


# ─── Stage 1.5 Output: Data / Literature Scout ────────────────────────────────

class TopicScoutOutput(BaseModel):
    """
    Structured output from the TopicDataScout agent.
    scout_type = "dataset" → found datasets, papers, tools
    scout_type = "literature" → found papers, key authors, tools only
    """
    scout_type: str = Field(description="'dataset' or 'literature'")
    datasets: List[ScoutDataset] = Field(default_factory=list)
    papers: List[ScoutPaper] = Field(default_factory=list)
    tools: List[ScoutTool] = Field(default_factory=list)
    key_authors: List[ScoutKeyAuthor] = Field(default_factory=list)
    availability_summary: str = Field(default="")
    data_verdict: str = Field(default="")

    def to_advisor_context(self) -> str:
        """
        Formats the scout output as plain text for passing to the advisor agent.
        The advisor uses this to present findings instead of asking for them.
        """
        lines = []

        if self.scout_type == "dataset":
            if self.datasets:
                lines.append("DATASETS FOUND:")
                for i, d in enumerate(self.datasets, 1):
                    lines.append(f"{i}. {d.name} — {d.description} ({d.source}, {d.access}) | {d.url}")
            else:
                lines.append("DATASETS FOUND: None publicly available for this specific topic.")

        if self.papers:
            lines.append("\nKEY PAPERS:")
            for i, p in enumerate(self.papers, 1):
                lines.append(f"{i}. {p.title} ({p.year}) — {p.relevance} | {p.url}")

        if self.key_authors:
            lines.append("\nKEY AUTHORS IN THIS FIELD:")
            for a in self.key_authors:
                lines.append(f"- {a.name} ({a.institution}): {a.contribution}")

        if self.tools:
            lines.append("\nTOOLS / LIBRARIES:")
            for t in self.tools:
                lines.append(f"- {t.name}: {t.description} | {t.url}")

        if self.availability_summary:
            lines.append(f"\nAVAILABILITY: {self.availability_summary}")

        return "\n".join(lines)


# ─── Similar Projects Scout Output ────────────────────────────────────────────

class SimilarProject(BaseModel):
    """A real student project found via web search, similar to the chosen topic."""
    title: str
    author: str = "Unknown"
    year: str
    institution: str
    level: str  # BSc / MSc / PhD
    similarity_score: int = Field(ge=0, le=100)
    similarity_reason: str
    url: str
    abstract_snippet: str = ""


class ProjectScoutOutput(BaseModel):
    """Output from the TopicProjectScout agent."""
    projects: List[SimilarProject] = Field(default_factory=list)
    search_note: str = ""


# ─── Stage 2-4 Output: Topic Advisor ──────────────────────────────────────────

class TopicAdvisorOutput(BaseModel):
    message: str = Field(description="The AI advisor's plain-text response")


class FinalTopicOutput(BaseModel):
    suggested_title: str
    description: str
    next_steps: List[str]
    ready_message: str
