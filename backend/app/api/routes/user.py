"""
User Routes

Purpose: User profile and settings endpoints

MODEL TIER ADDITION:
  Two new endpoints added:
    GET  /user/settings/models  — returns current tier, all agent metadata,
                                  and the resolved per-agent model map
    PUT  /user/settings/models  — saves tier + optional custom config to DB

API KEY ADDITION:
  Two new endpoints for BYOK (bring-your-own-key) support:
    GET  /user/api-key          — returns whether key is set (masked, never returns raw key)
    PUT  /user/api-key          — saves or clears the user's OpenAI API key

  All existing endpoints (profile, stats, delete) are preserved verbatim.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional, Dict, List

from app.models.database import User, Project
from app.api.dependencies import get_db_session, get_current_user

router = APIRouter(prefix="/user", tags=["User"])
security = HTTPBearer()


# ─── Existing response models — UNCHANGED ─────────────────────────────────────

class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: str
    last_login: Optional[str]
    total_projects: int
    completed_projects: int


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None


# ─── Existing endpoints — UNCHANGED ───────────────────────────────────────────

@router.get("/profile", response_model=UserProfile)
async def get_user_profile(
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get current user's profile
    """

    from app.models.database import ProjectStatus

    total_projects = db.query(Project).filter(Project.user_id == user.id).count()

    completed_projects = db.query(Project).filter(
        Project.user_id == user.id,
        Project.status == ProjectStatus.COMPLETE
    ).count()

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at.isoformat(),
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "total_projects": total_projects,
        "completed_projects": completed_projects
    }


@router.patch("/profile")
async def update_user_profile(
    request: UpdateProfileRequest,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Update user profile
    """

    if request.full_name:
        user.full_name = request.full_name

    db.commit()

    return {
        "success": True,
        "message": "Profile updated"
    }


@router.get("/stats")
async def get_user_stats(
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get user statistics
    """

    from app.models.database import ProjectStatus
    from sqlalchemy import func
    from app.models.database import ProjectAnalytics

    # Project counts by status
    projects = db.query(Project).filter(Project.user_id == user.id).all()

    status_counts = {}
    for status in ProjectStatus:
        count = sum(1 for p in projects if p.status == status)
        if count > 0:
            status_counts[status.value] = count

    # Average marks
    completed_projects = [p for p in projects if p.result]
    avg_marks = sum(p.result.total_marks for p in completed_projects) / len(completed_projects) if completed_projects else 0

    # Total generation time
    analytics = db.query(ProjectAnalytics).join(Project).filter(Project.user_id == user.id).all()
    total_time = sum(a.total_generation_time or 0 for a in analytics)

    return {
        "total_projects": len(projects),
        "status_breakdown": status_counts,
        "completed_projects": len(completed_projects),
        "average_marks": round(avg_marks, 1),
        "total_generation_time_seconds": total_time,
        "total_generation_time_hours": round(total_time / 3600, 1)
    }


@router.delete("/account")
async def delete_account(
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Delete user account and all associated data
    """

    # Delete user (cascade will delete projects)
    db.delete(user)
    db.commit()

    return {
        "success": True,
        "message": "Account deleted"
    }


# ─── Model Tier Settings — NEW ────────────────────────────────────────────────

class AgentModelSettingResponse(BaseModel):
    """One agent as returned in the settings response."""
    key:              str
    display_name:     str
    description:      str
    phase:            str
    cost_impact:      str
    current_model:    str   # what model is actually active for this user right now
    production_model: str   # the recommended production default
    testing_model:    str   # the cheapest testing option


class ModelSettingsResponse(BaseModel):
    """Full response for GET /user/settings/models"""
    tier:             str                          # "testing" | "production" | "custom"
    available_models: List[Dict]                   # list of {id, label, description, tier_badge}
    agents:           List[AgentModelSettingResponse]


class UpdateModelSettingsRequest(BaseModel):
    """
    Body for PUT /user/settings/models

    tier: required — "testing" | "production" | "custom"
    custom_config: only read when tier == "custom"
                   dict mapping agent_key → model_id
                   Example: {"professor_reviewer": "gpt-4o", "literature_strategist": "gpt-4o-mini"}
    """
    tier:          str
    custom_config: Optional[Dict[str, str]] = None


@router.get("/settings/models", response_model=ModelSettingsResponse)
async def get_model_settings(
    user = Depends(get_current_user),
):
    """
    Return the user's current model tier settings.

    Includes:
    - Their selected tier (testing / production / custom)
    - All available models they can choose from
    - Per-agent breakdown: what model is currently active, what the defaults are,
      and a plain-English description of what each agent does.

    This endpoint powers the settings UI panel.
    """
    from app.models.agent_config import (
        ModelTier, AgentModelConfig, AGENT_REGISTRY,
        AVAILABLE_MODELS, build_agent_config_for_user,
    )

    # Resolve the user's current config
    tier_str = user.model_tier or "production"
    resolved = build_agent_config_for_user(
        model_tier=tier_str,
        custom_model_config=user.custom_model_config,
    )

    agents_out = []
    for meta in AGENT_REGISTRY:
        agents_out.append(AgentModelSettingResponse(
            key=meta.key.value,
            display_name=meta.display_name,
            description=meta.description,
            phase=meta.phase,
            cost_impact=meta.cost_impact,
            current_model=resolved.get(meta.key),
            production_model=meta.production_model,
            testing_model=meta.testing_model,
        ))

    return ModelSettingsResponse(
        tier=tier_str,
        available_models=AVAILABLE_MODELS,
        agents=agents_out,
    )


@router.put("/settings/models")
async def update_model_settings(
    request: UpdateModelSettingsRequest,
    user = Depends(get_current_user),
    db = Depends(get_db_session),
):
    """
    Save the user's model tier settings.

    Validates that:
    - tier is one of the three valid values
    - custom_config keys are valid agent keys (invalid keys are silently dropped —
      we don't want user settings to crash if we rename an agent in a future deploy)
    - custom_config model ids exist in AVAILABLE_MODELS

    Returns the resolved per-agent model map so the UI can update immediately
    without a second GET request.
    """
    from app.models.agent_config import (
        ModelTier, AGENT_REGISTRY, AVAILABLE_MODEL_IDS, build_agent_config_for_user,
    )

    # Validate tier
    valid_tiers = {t.value for t in ModelTier}
    if request.tier not in valid_tiers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid tier '{request.tier}'. Must be one of: {sorted(valid_tiers)}",
        )

    # Validate and sanitise custom_config if present
    sanitised_custom: Optional[Dict[str, str]] = None
    if request.tier == ModelTier.CUSTOM.value and request.custom_config:
        valid_agent_keys = {a.key.value for a in AGENT_REGISTRY}
        sanitised_custom = {
            k: v
            for k, v in request.custom_config.items()
            if k in valid_agent_keys and v in AVAILABLE_MODEL_IDS
        }

    # Persist to DB
    user.model_tier          = request.tier
    user.custom_model_config = sanitised_custom if request.tier == ModelTier.CUSTOM.value else None
    db.commit()

    # Resolve and return the active model map so the UI can update immediately
    resolved = build_agent_config_for_user(
        model_tier=request.tier,
        custom_model_config=sanitised_custom,
    )

    return {
        "success":         True,
        "tier":            request.tier,
        "resolved_models": resolved.models,   # agent_key → model_id for all agents
    }


# ─── API Key (BYOK) Settings — NEW ───────────────────────────────────────────

class ApiKeyStatusResponse(BaseModel):
    """Never returns the raw key — only whether it's set and a masked preview."""
    has_key:       bool
    masked_key:    Optional[str]   # e.g. "sk-...ab3f" — last 4 chars only
    key_source:    str             # "user" | "system" — which key will be used


class SaveApiKeyRequest(BaseModel):
    """
    Body for PUT /user/api-key

    api_key: the raw OpenAI key to store, or empty string / null to clear it.
    """
    api_key: Optional[str] = None


@router.get("/api-key", response_model=ApiKeyStatusResponse)
async def get_api_key_status(
    user = Depends(get_current_user),
):
    """
    Return whether the user has a personal API key stored.

    NEVER returns the raw key — only a masked preview and a boolean.
    This is used by the settings UI to show the current state.
    """
    has_key = bool(user.openai_api_key)
    masked  = None
    if has_key and len(user.openai_api_key) >= 8:
        masked = f"sk-...{user.openai_api_key[-4:]}"

    return ApiKeyStatusResponse(
        has_key=has_key,
        masked_key=masked,
        key_source="user" if has_key else "system",
    )


@router.put("/api-key")
async def save_api_key(
    request: SaveApiKeyRequest,
    user = Depends(get_current_user),
    db   = Depends(get_db_session),
):
    """
    Save or clear the user's personal OpenAI API key.

    Passing null or empty string clears the key (reverts to system key).
    Passing a key string saves it — basic format validation only.

    In production you should encrypt this field at rest.
    """
    raw_key = (request.api_key or "").strip()

    if raw_key:
        # Basic sanity check — OpenAI keys start with "sk-"
        if not raw_key.startswith("sk-"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="API key must start with 'sk-'. Please check the key and try again.",
            )
        user.openai_api_key = raw_key
        message = "API key saved. Your generations will now use your personal OpenAI account."
    else:
        user.openai_api_key = None
        message = "API key cleared. Generations will use the shared system key."

    db.commit()

    return {
        "success": True,
        "message": message,
        "has_key": bool(user.openai_api_key),
    }