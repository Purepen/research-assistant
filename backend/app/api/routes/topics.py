"""
Topic Discovery Routes — v4 UPDATE
=====================================
File: backend/app/api/routes/topics.py

CHANGES:
- POST /topics/scout now returns structured TopicScoutResponse with typed arrays
  (datasets with URLs, papers with URLs, tools, key_authors)
- POST /topics/refine accepts scout_context (pre-formatted string) instead of raw report
- NEW: POST /topics/find-projects — finds 2 similar student projects
"""

from __future__ import annotations

from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user
from app.core.pipelines.phase0_topic_discovery_workflow import (
    run_topic_discovery,
    run_data_scout,
    run_project_scout,
    run_topic_advisor,
    parse_final_topic,
)
from app.models.topic_discovery import (
    DiscoveredTopic, TopicDiscoveryOutput,
    ScoutDataset, ScoutPaper, ScoutTool, ScoutKeyAuthor,
    SimilarProject,
)

router = APIRouter(prefix="/topics", tags=["Topic Discovery"])


# ══════════════════════════════════════════════════════════════════════════════
# Request / Response Models
# ══════════════════════════════════════════════════════════════════════════════

class TopicDiscoveryRequest(BaseModel):
    degree_level:       Literal["BSc", "MSc"]
    field:              str
    project_type:       Literal["research-based", "practical", "mixed", "not-sure"]
    preferred_activity: List[str]
    interest_areas:     List[str]
    geographic_focus:   Literal["university", "city", "country", "africa", "europe", "global", "none"]
    ambition_level:     Literal["manageable", "impressive", "distinction", "cv-strong"]
    confidence_level:   Literal["very-confused", "somewhat-unsure", "rough-direction", "have-idea"]

class TopicDiscoveryResponse(BaseModel):
    clusters:    List[str]
    topics:      List[DiscoveredTopic]
    prompt_note: str


class TopicScoutRequest(BaseModel):
    topic_title:  str
    field:        str
    degree_level: str
    project_type: str = "mixed"  # NEW — determines dataset vs literature mode

class TopicScoutResponse(BaseModel):
    """Structured response with typed resource arrays — all items have URLs."""
    scout_type:           str                    # "dataset" or "literature"
    datasets:             List[ScoutDataset]     # each has .name .description .source .url .access
    papers:               List[ScoutPaper]       # each has .title .year .relevance .url
    tools:                List[ScoutTool]        # each has .name .description .url
    key_authors:          List[ScoutKeyAuthor]   # each has .name .institution .contribution
    availability_summary: str
    data_verdict:         str
    advisor_context:      str                    # pre-formatted text passed to advisor explain stage


class TopicRefineRequest(BaseModel):
    topic_title:     str
    topic_one_liner: str
    field:           str
    degree_level:    str
    ambition_level:  str
    stage:           Literal["explain", "questions", "feasibility", "final"]
    student_message: Optional[str] = None
    conversation:    List[dict] = Field(default_factory=list)
    scout_context:   Optional[str] = None  # pre-formatted string from TopicScoutResponse.advisor_context

class TopicRefineResponse(BaseModel):
    ai_message:          str
    is_final:            bool = False
    refined_topic:       Optional[str] = None
    refined_description: Optional[str] = None
    suggested_title:     Optional[str] = None
    next_steps:          Optional[List[str]] = None


class ProjectScoutRequest(BaseModel):
    topic_title:  str
    field:        str
    degree_level: str

class ProjectScoutResponse(BaseModel):
    projects:    List[SimilarProject]
    search_note: str


# ══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/discover", response_model=TopicDiscoveryResponse)
async def discover_topics(req: TopicDiscoveryRequest, user=Depends(get_current_user)):
    try:
        output: TopicDiscoveryOutput = await run_topic_discovery(
            degree_level=req.degree_level, field=req.field, project_type=req.project_type,
            preferred_activity=req.preferred_activity, interest_areas=req.interest_areas,
            geographic_focus=req.geographic_focus, ambition_level=req.ambition_level,
            confidence_level=req.confidence_level,
        )
        return TopicDiscoveryResponse(clusters=output.clusters, topics=output.topics, prompt_note=output.prompt_note)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic discovery failed: {str(e)}")


@router.post("/scout", response_model=TopicScoutResponse)
async def scout_topic_data(req: TopicScoutRequest, user=Depends(get_current_user)):
    """
    Stage 1.5: Searches for resources for a selected topic.
    Returns structured typed arrays — each item has a URL.
    Also returns advisor_context: a pre-formatted string to pass into /refine.
    """
    try:
        output = await run_data_scout(
            topic_title=req.topic_title,
            field=req.field,
            degree_level=req.degree_level,
            project_type=req.project_type,
        )
        return TopicScoutResponse(
            scout_type=output.scout_type,
            datasets=output.datasets,
            papers=output.papers,
            tools=output.tools,
            key_authors=output.key_authors,
            availability_summary=output.availability_summary,
            data_verdict=output.data_verdict,
            advisor_context=output.to_advisor_context(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data scout failed: {str(e)}")


@router.post("/refine", response_model=TopicRefineResponse)
async def refine_topic(req: TopicRefineRequest, user=Depends(get_current_user)):
    try:
        output = await run_topic_advisor(
            topic_title=req.topic_title, topic_one_liner=req.topic_one_liner,
            field=req.field, degree_level=req.degree_level, ambition_level=req.ambition_level,
            stage=req.stage, student_message=req.student_message,
            conversation=req.conversation, scout_context=req.scout_context,
        )
        is_final = req.stage == "final"
        if is_final:
            parsed = parse_final_topic(output.message, req.topic_title)
            return TopicRefineResponse(
                ai_message=output.message, is_final=True,
                refined_topic=parsed.suggested_title, refined_description=parsed.description,
                suggested_title=parsed.suggested_title, next_steps=parsed.next_steps,
            )
        return TopicRefineResponse(ai_message=output.message, is_final=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic advisor failed: {str(e)}")


@router.post("/find-projects", response_model=ProjectScoutResponse)
async def find_similar_projects(req: ProjectScoutRequest, user=Depends(get_current_user)):
    """
    Post-final: Searches for 2 real similar student projects to use
    as 'past projects' in spec generation.
    """
    try:
        output = await run_project_scout(
            topic_title=req.topic_title,
            field=req.field,
            degree_level=req.degree_level,
        )
        return ProjectScoutResponse(projects=output.projects, search_note=output.search_note)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project scout failed: {str(e)}")
