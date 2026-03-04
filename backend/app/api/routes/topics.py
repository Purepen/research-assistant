"""
Topic Discovery Routes — v5 (Phase 1 + Phase 2 Combined)
==========================================================
File: backend/app/api/routes/topics.py

Phase 1 additions (DB persistence):
  - Auto-save TopicSession on /refine final stage
  - GET  /topics/history
  - POST /topics/link-project
  - DEL  /topics/history/{id}

Phase 2 additions (Vetter):
  - POST /topics/vet        — new "I have a topic" path
  - POST /topics/vet/save   — saves a vetted topic to DB after user chooses
                              original or refined title

All existing endpoints (discover, scout, refine, find-projects) unchanged.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user, get_db_session
from app.core.pipelines.phase0_topic_discovery_workflow import (
    run_topic_discovery,
    run_data_scout,
    run_project_scout,
    run_topic_advisor,
    run_topic_vet,
    parse_final_topic,
    VetTopicOutput,
)
from app.models.topic_discovery import (
    DiscoveredTopic, TopicDiscoveryOutput,
    ScoutDataset, ScoutPaper, ScoutTool, ScoutKeyAuthor,
    SimilarProject,
)
from app.models.database import TopicSession, TopicOrigin

router = APIRouter(prefix="/topics", tags=["Topic Discovery"])


# ══════════════════════════════════════════════════════════════════════════════
# Request / Response Models — Existing (unchanged)
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
    project_type: str = "mixed"

class TopicScoutResponse(BaseModel):
    scout_type:           str
    datasets:             List[ScoutDataset]
    papers:               List[ScoutPaper]
    tools:                List[ScoutTool]
    key_authors:          List[ScoutKeyAuthor]
    availability_summary: str
    data_verdict:         str
    advisor_context:      str


class TopicRefineRequest(BaseModel):
    topic_title:      str
    topic_one_liner:  str
    field:            str
    degree_level:     str
    ambition_level:   str
    stage:            Literal["explain", "questions", "feasibility", "final"]
    student_message:  Optional[str]  = None
    conversation:     List[dict]     = Field(default_factory=list)
    scout_context:    Optional[str]  = None
    # Used for auto-save on final stage
    project_type:     Optional[str]  = None
    geographic_focus: Optional[str]  = None
    scout_data_json:  Optional[dict] = None

class TopicRefineResponse(BaseModel):
    ai_message:          str
    is_final:            bool               = False
    refined_topic:       Optional[str]      = None
    refined_description: Optional[str]      = None
    suggested_title:     Optional[str]      = None
    next_steps:          Optional[List[str]]= None
    topic_session_id:    Optional[int]      = None   # returned after auto-save


class ProjectScoutRequest(BaseModel):
    topic_title:  str
    field:        str
    degree_level: str

class ProjectScoutResponse(BaseModel):
    projects:    List[SimilarProject]
    search_note: str


# ══════════════════════════════════════════════════════════════════════════════
# Request / Response Models — Phase 2 Vetter (new)
# ══════════════════════════════════════════════════════════════════════════════

class TopicVetRequest(BaseModel):
    """Student submits their existing topic + context for AI vetting."""
    original_topic:   str
    field:            str
    degree_level:     Literal["BSc", "MSc"]
    project_type:     str                   = "mixed"
    geographic_focus: str                   = "none"
    ambition_level:   str                   = "impressive"

class TopicVetResponse(BaseModel):
    """Structured vetting result sent to the frontend."""
    verdict:           str          # "STRONG" | "REFINED" | "PIVOTED"
    your_take:         str
    strengths:         List[str]
    concerns:          List[str]
    original_title:    str
    refined_title:     str
    refined_rationale: str
    one_liner:         str
    closing:           str
    ai_message:        str          # full raw message — fallback display


class TopicVetSaveRequest(BaseModel):
    """
    After the user sees the vet result and chooses original or refined title,
    the frontend calls this to persist the decision to the DB.

    chosen_title: whichever the user picked (original or refined)
    origin:
      "provided" → user stuck with their original title
      "vetted"   → user accepted the AI-refined title
    """
    original_topic:   str
    chosen_title:     str
    one_liner:        str
    field:            str
    degree_level:     str
    project_type:     Optional[str] = None
    ambition_level:   Optional[str] = None
    geographic_focus: Optional[str] = None
    origin:           Literal["provided", "vetted"] = "vetted"

class TopicVetSaveResponse(BaseModel):
    topic_session_id: int
    chosen_title:     str
    origin:           str


# ══════════════════════════════════════════════════════════════════════════════
# Request / Response Models — History (Phase 1, unchanged)
# ══════════════════════════════════════════════════════════════════════════════

class TopicHistoryItem(BaseModel):
    id:                int
    final_topic:       str
    description:       Optional[str]
    field:             str
    degree_level:      str
    project_type:      Optional[str]
    ambition_level:    Optional[str]
    origin:            str
    original_topic:    Optional[str]
    linked_project_id: Optional[int]
    created_at:        str

class TopicHistoryResponse(BaseModel):
    total:  int
    topics: List[TopicHistoryItem]


class LinkProjectRequest(BaseModel):
    topic_session_id: int
    project_id:       int


# ══════════════════════════════════════════════════════════════════════════════
# Internal Helper — persist TopicSession
# ══════════════════════════════════════════════════════════════════════════════

def _save_topic_session(
    *,
    db,
    user_id:           int,
    final_topic:       str,
    description:       Optional[str],
    field:             str,
    degree_level:      str,
    origin:            TopicOrigin,
    original_topic:    Optional[str] = None,
    project_type:      Optional[str] = None,
    ambition_level:    Optional[str] = None,
    geographic_focus:  Optional[str] = None,
    scout_data_json:   Optional[dict]= None,
) -> TopicSession:
    """Creates and commits a TopicSession row. Never throws — caller wraps in try/except."""
    session = TopicSession(
        user_id          = user_id,
        final_topic      = final_topic,
        description      = description,
        field            = field,
        degree_level     = degree_level,
        academic_level   = degree_level,
        origin           = origin,
        original_topic   = original_topic,
        project_type     = project_type,
        ambition_level   = ambition_level,
        geographic_focus = geographic_focus,
        scout_data_json  = scout_data_json,
        created_at       = datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    print(f"✅ TopicSession #{session.id} saved — user {user_id}: '{final_topic[:50]}'")
    return session


# ══════════════════════════════════════════════════════════════════════════════
# Existing Endpoints (logic unchanged, db param added to /refine)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/discover", response_model=TopicDiscoveryResponse)
async def discover_topics(
    req: TopicDiscoveryRequest,
    user=Depends(get_current_user),
):
    try:
        output: TopicDiscoveryOutput = await run_topic_discovery(
            degree_level=req.degree_level, field=req.field, project_type=req.project_type,
            preferred_activity=req.preferred_activity, interest_areas=req.interest_areas,
            geographic_focus=req.geographic_focus, ambition_level=req.ambition_level,
            confidence_level=req.confidence_level,
        )
        return TopicDiscoveryResponse(
            clusters=output.clusters,
            topics=output.topics,
            prompt_note=output.prompt_note,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic discovery failed: {str(e)}")


@router.post("/scout", response_model=TopicScoutResponse)
async def scout_topic_data(
    req: TopicScoutRequest,
    user=Depends(get_current_user),
):
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
async def refine_topic(
    req: TopicRefineRequest,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """
    AI advisor conversation loop.
    When stage='final', a TopicSession is auto-saved and its id returned.
    """
    try:
        output = await run_topic_advisor(
            topic_title=req.topic_title,
            topic_one_liner=req.topic_one_liner,
            field=req.field,
            degree_level=req.degree_level,
            ambition_level=req.ambition_level,
            stage=req.stage,
            student_message=req.student_message,
            conversation=req.conversation,
            scout_context=req.scout_context,
        )

        is_final = req.stage == "final"

        if is_final:
            parsed = parse_final_topic(output.message, req.topic_title)

            # Auto-save — wrapped so failure never blocks the user response
            try:
                saved = _save_topic_session(
                    db=db,
                    user_id=user.id,
                    final_topic=parsed.suggested_title or req.topic_title,
                    description=parsed.description,
                    field=req.field,
                    degree_level=req.degree_level,
                    origin=TopicOrigin.DISCOVERED,
                    project_type=req.project_type,
                    ambition_level=req.ambition_level,
                    geographic_focus=req.geographic_focus,
                    scout_data_json=req.scout_data_json,
                )
                session_id = saved.id
            except Exception as save_err:
                print(f"⚠️  TopicSession save failed (non-fatal): {save_err}")
                session_id = None

            return TopicRefineResponse(
                ai_message=output.message,
                is_final=True,
                refined_topic=parsed.suggested_title,
                refined_description=parsed.description,
                suggested_title=parsed.suggested_title,
                next_steps=parsed.next_steps,
                topic_session_id=session_id,
            )

        return TopicRefineResponse(ai_message=output.message, is_final=False)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic advisor failed: {str(e)}")


@router.post("/find-projects", response_model=ProjectScoutResponse)
async def find_similar_projects(
    req: ProjectScoutRequest,
    user=Depends(get_current_user),
):
    try:
        output = await run_project_scout(
            topic_title=req.topic_title,
            field=req.field,
            degree_level=req.degree_level,
        )
        return ProjectScoutResponse(
            projects=output.projects,
            search_note=output.search_note,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project scout failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 — NEW: Topic Vetter Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/vet", response_model=TopicVetResponse)
async def vet_topic(
    req: TopicVetRequest,
    user=Depends(get_current_user),
):
    """
    "I already have a topic" path.

    Runs the topic_vetter_agent against the student's existing topic and
    returns a structured assessment: verdict (STRONG / REFINED / PIVOTED),
    strengths, concerns, and an optionally refined title.

    The frontend shows both the original and refined title side by side,
    lets the user choose, then calls POST /topics/vet/save to persist.
    """
    try:
        result: VetTopicOutput = await run_topic_vet(
            original_topic=req.original_topic,
            field=req.field,
            degree_level=req.degree_level,
            project_type=req.project_type,
            geographic_focus=req.geographic_focus,
            ambition_level=req.ambition_level,
        )
        return TopicVetResponse(
            verdict=result.verdict,
            your_take=result.your_take,
            strengths=result.strengths,
            concerns=result.concerns,
            original_title=result.original_title,
            refined_title=result.refined_title,
            refined_rationale=result.refined_rationale,
            one_liner=result.one_liner,
            closing=result.closing,
            ai_message=result.ai_message,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic vetting failed: {str(e)}")


@router.post("/vet/save", response_model=TopicVetSaveResponse)
async def save_vetted_topic(
    req: TopicVetSaveRequest,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """
    Persists the user's final decision after seeing the vet result.

    Called once the user taps "Use this topic" or "Keep my original"
    on the vet result screen. The chosen_title becomes final_topic in
    the DB. origin reflects whether they took the AI's suggestion or not.

    Returns topic_session_id so the frontend can pass it to /generate
    for linking later.
    """
    try:
        origin_enum = (
            TopicOrigin.VETTED    if req.origin == "vetted"
            else TopicOrigin.PROVIDED
        )

        saved = _save_topic_session(
            db=db,
            user_id=user.id,
            final_topic=req.chosen_title,
            description=req.one_liner,
            field=req.field,
            degree_level=req.degree_level,
            origin=origin_enum,
            original_topic=req.original_topic,
            project_type=req.project_type,
            ambition_level=req.ambition_level,
            geographic_focus=req.geographic_focus,
            scout_data_json=None,  # vetting path skips scouting
        )

        return TopicVetSaveResponse(
            topic_session_id=saved.id,
            chosen_title=req.chosen_title,
            origin=req.origin,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save vetted topic: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
# Phase 1 — History / Link Endpoints (unchanged logic)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/history", response_model=TopicHistoryResponse)
async def get_topic_history(
    skip:  int = 0,
    limit: int = 50,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """Returns the current user's full topic history, newest first."""
    total = db.query(TopicSession).filter(TopicSession.user_id == user.id).count()

    sessions = (
        db.query(TopicSession)
        .filter(TopicSession.user_id == user.id)
        .order_by(TopicSession.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [
        TopicHistoryItem(
            id=s.id,
            final_topic=s.final_topic,
            description=s.description,
            field=s.field,
            degree_level=s.degree_level,
            project_type=s.project_type,
            ambition_level=s.ambition_level,
            origin=s.origin.value if s.origin else "discovered",
            original_topic=s.original_topic,
            linked_project_id=s.linked_project_id,
            created_at=s.created_at.isoformat(),
        )
        for s in sessions
    ]

    return TopicHistoryResponse(total=total, topics=items)


@router.post("/link-project")
async def link_topic_to_project(
    req: LinkProjectRequest,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """Links a TopicSession to the Project generated from it."""
    session = db.query(TopicSession).filter(
        TopicSession.id == req.topic_session_id,
        TopicSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Topic session not found")

    from app.models.database import Project
    project = db.query(Project).filter(
        Project.id == req.project_id,
        Project.user_id == user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    session.linked_project_id = req.project_id
    project.topic_session_id  = req.topic_session_id
    db.commit()

    return {"success": True, "topic_session_id": session.id, "project_id": project.id}


@router.delete("/history/{session_id}")
async def delete_topic_session(
    session_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """Removes a single TopicSession from the user's history."""
    session = db.query(TopicSession).filter(
        TopicSession.id == session_id,
        TopicSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Topic session not found")

    db.delete(session)
    db.commit()
    return {"success": True, "deleted_id": session_id}
