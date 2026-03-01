"""
Topic Discovery Routes
======================
File: backend/app/api/routes/topics.py

Thin API layer — exactly the same pattern as research.py and projects.py.
All business logic lives in the pipeline and agents, not here.

Endpoints:
  POST /topics/discover  — Stage 1: 8-question form → ranked topic clusters
  POST /topics/refine    — Stages 2-4: conversational feasibility chat
"""

from __future__ import annotations

from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user

# ── Pipeline functions (all agent logic lives here) ────────────────────────────
from app.core.pipelines.phase0_topic_discovery_workflow import (
    run_topic_discovery,
    run_topic_advisor,
    parse_final_topic,
)

# ── Output models (shared with pipeline) ───────────────────────────────────────
from app.models.topic_discovery import DiscoveredTopic, TopicDiscoveryOutput

router = APIRouter(prefix="/topics", tags=["Topic Discovery"])


# ══════════════════════════════════════════════════════════════════════════════
# Request / Response Models
# ══════════════════════════════════════════════════════════════════════════════

class TopicDiscoveryRequest(BaseModel):
    """Stage 1 — the 8-question student profile form."""
    degree_level:       Literal["BSc", "MSc"]
    field:              str
    project_type:       Literal["research-based", "practical", "mixed", "not-sure"]
    preferred_activity: List[str]
    interest_areas:     List[str]
    geographic_focus:   Literal["university", "city", "country", "africa", "europe", "global", "none"]
    ambition_level:     Literal["manageable", "impressive", "distinction", "cv-strong"]
    confidence_level:   Literal["very-confused", "somewhat-unsure", "rough-direction", "have-idea"]


class TopicDiscoveryResponse(BaseModel):
    """Stage 1 response — clusters and ranked topics."""
    clusters:    List[str]
    topics:      List[DiscoveredTopic]
    prompt_note: str


class TopicRefineRequest(BaseModel):
    """Stages 2-4 — selected topic + conversation history + current stage."""
    topic_title:     str
    topic_one_liner: str
    field:           str
    degree_level:    str
    ambition_level:  str
    stage:           Literal["explain", "questions", "feasibility", "final"]
    student_message: Optional[str] = None
    conversation:    List[dict] = Field(default_factory=list)


class TopicRefineResponse(BaseModel):
    """Stages 2-4 response — AI advisor message + optional final topic data."""
    ai_message:          str
    is_final:            bool = False
    refined_topic:       Optional[str] = None
    refined_description: Optional[str] = None
    suggested_title:     Optional[str] = None
    next_steps:          Optional[List[str]] = None


# ══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/discover", response_model=TopicDiscoveryResponse)
async def discover_topics(
    req:  TopicDiscoveryRequest,
    user = Depends(get_current_user),
):
    """
    Stage 1 of the Topic Discovery Engine.

    Accepts the 8-question student profile form and returns 12 ranked topic
    suggestions grouped into thematic clusters.

    Delegates entirely to run_topic_discovery() in the pipeline, which uses
    the topic_discovery_agent via Runner.run() — consistent with all other
    agents in the system.
    """
    try:
        output: TopicDiscoveryOutput = await run_topic_discovery(
            degree_level       = req.degree_level,
            field              = req.field,
            project_type       = req.project_type,
            preferred_activity = req.preferred_activity,
            interest_areas     = req.interest_areas,
            geographic_focus   = req.geographic_focus,
            ambition_level     = req.ambition_level,
            confidence_level   = req.confidence_level,
        )

        return TopicDiscoveryResponse(
            clusters    = output.clusters,
            topics      = output.topics,
            prompt_note = output.prompt_note,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Topic discovery failed: {str(e)}",
        )


@router.post("/refine", response_model=TopicRefineResponse)
async def refine_topic(
    req:  TopicRefineRequest,
    user = Depends(get_current_user),
):
    """
    Stages 2-4 of the Topic Discovery Engine.

    Runs the conversational AI advisor for a student's selected topic.
    The correct agent is selected by the pipeline based on the stage value:
      "explain"     → TopicAdvisorExplain agent
      "questions"   → TopicAdvisorQuestions agent
      "feasibility" → TopicAdvisorFeasibility agent
      "final"       → TopicAdvisorFinal agent

    On the "final" stage, the structured response is parsed into a
    FinalTopicOutput with a clean title, description, and next steps.
    """
    try:
        output = await run_topic_advisor(
            topic_title     = req.topic_title,
            topic_one_liner = req.topic_one_liner,
            field           = req.field,
            degree_level    = req.degree_level,
            ambition_level  = req.ambition_level,
            stage           = req.stage,
            student_message = req.student_message,
            conversation    = req.conversation,
        )

        is_final = req.stage == "final"

        # On the final stage, parse the structured output for the frontend
        if is_final:
            parsed = parse_final_topic(
                raw_message    = output.message,
                fallback_title = req.topic_title,
            )
            return TopicRefineResponse(
                ai_message          = output.message,
                is_final            = True,
                refined_topic       = parsed.suggested_title,
                refined_description = parsed.description,
                suggested_title     = parsed.suggested_title,
                next_steps          = parsed.next_steps,
            )

        return TopicRefineResponse(
            ai_message = output.message,
            is_final   = False,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Topic advisor failed: {str(e)}",
        )
