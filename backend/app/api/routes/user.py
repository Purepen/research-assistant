"""
User Routes

Purpose: User profile and settings endpoints

MODEL TIER ADDITION:
  Two new endpoints:
    GET  /user/settings/models  — returns current tier, all agent metadata,
                                  and the resolved per-agent model map
    PUT  /user/settings/models  — saves tier + optional custom config to DB

API KEY ADDITION (BYOK):
  GET  /user/api-key  — returns whether key is set (masked, never returns raw key)
  PUT  /user/api-key  — validates key against OpenAI API BEFORE saving it.
                        Returns is_valid: bool in the response so the UI can
                        show "Key validated ✓" or "Key invalid ✗" immediately.
                        If validation fails, nothing is stored.

  All existing endpoints (profile, stats, delete) are preserved verbatim.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional, Dict, List

from app.models.database import Project
from app.api.dependencies import get_db_session, get_current_user

router   = APIRouter(prefix="/user", tags=["User"])
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
    db   = Depends(get_db_session),
):
    """Get current user's profile"""
    from app.models.database import ProjectStatus

    total_projects = db.query(Project).filter(Project.user_id == user.id).count()
    completed_projects = db.query(Project).filter(
        Project.user_id == user.id,
        Project.status  == ProjectStatus.COMPLETE,
    ).count()

    return {
        "id":                 user.id,
        "email":              user.email,
        "full_name":          user.full_name,
        "created_at":         user.created_at.isoformat(),
        "last_login":         user.last_login.isoformat() if user.last_login else None,
        "total_projects":     total_projects,
        "completed_projects": completed_projects,
    }


@router.patch("/profile")
async def update_user_profile(
    request: UpdateProfileRequest,
    user = Depends(get_current_user),
    db   = Depends(get_db_session),
):
    """Update user profile"""
    if request.full_name:
        user.full_name = request.full_name
    db.commit()
    return {"success": True, "message": "Profile updated"}


@router.get("/stats")
async def get_user_stats(
    user = Depends(get_current_user),
    db   = Depends(get_db_session),
):
    """Get user statistics"""
    from app.models.database import ProjectStatus, ProjectAnalytics

    projects = db.query(Project).filter(Project.user_id == user.id).all()

    status_counts: Dict[str, int] = {}
    for s in ProjectStatus:
        count = sum(1 for p in projects if p.status == s)
        if count > 0:
            status_counts[s.value] = count

    completed = [p for p in projects if p.result]
    avg_marks = (
        sum(p.result.total_marks for p in completed) / len(completed)
        if completed else 0
    )

    analytics  = db.query(ProjectAnalytics).join(Project).filter(Project.user_id == user.id).all()
    total_time = sum(a.total_generation_time or 0 for a in analytics)

    return {
        "total_projects":                len(projects),
        "status_breakdown":              status_counts,
        "completed_projects":            len(completed),
        "average_marks":                 round(avg_marks, 1),
        "total_generation_time_seconds": total_time,
        "total_generation_time_hours":   round(total_time / 3600, 1),
        "has_own_api_key":               bool(user.openai_api_key),
        "free_topic_credit_used":        user.free_topic_credit_used,
        "free_spec_credit_used":         user.free_spec_credit_used,
    }


@router.delete("/account")
async def delete_account(
    user = Depends(get_current_user),
    db   = Depends(get_db_session),
):
    """Delete user account and all associated data"""
    db.delete(user)
    db.commit()
    return {"success": True, "message": "Account deleted"}


# ─── Model Tier Settings ──────────────────────────────────────────────────────

class AgentModelSettingResponse(BaseModel):
    key:              str
    display_name:     str
    description:      str
    phase:            str
    cost_impact:      str
    current_model:    str
    production_model: str
    testing_model:    str


class ModelSettingsResponse(BaseModel):
    tier:             str
    available_models: List[Dict]
    agents:           List[AgentModelSettingResponse]


class UpdateModelSettingsRequest(BaseModel):
    tier:          str
    custom_config: Optional[Dict[str, str]] = None


@router.get("/settings/models", response_model=ModelSettingsResponse)
async def get_model_settings(
    user = Depends(get_current_user),
):
    """Return the user's current model tier settings."""
    from app.models.agent_config import (
        AGENT_REGISTRY, AVAILABLE_MODELS, build_agent_config_for_user,
    )

    tier_str = user.model_tier or "production"
    resolved = build_agent_config_for_user(
        model_tier=tier_str,
        custom_model_config=user.custom_model_config,
    )

    agents_out = [
        AgentModelSettingResponse(
            key=meta.key.value,
            display_name=meta.display_name,
            description=meta.description,
            phase=meta.phase,
            cost_impact=meta.cost_impact,
            current_model=resolved.get(meta.key),
            production_model=meta.production_model,
            testing_model=meta.testing_model,
        )
        for meta in AGENT_REGISTRY
    ]

    return ModelSettingsResponse(
        tier=tier_str,
        available_models=AVAILABLE_MODELS,
        agents=agents_out,
    )


@router.put("/settings/models")
async def update_model_settings(
    request: UpdateModelSettingsRequest,
    user = Depends(get_current_user),
    db   = Depends(get_db_session),
):
    """Save the user's model tier settings."""
    from app.models.agent_config import (
        ModelTier, AGENT_REGISTRY, AVAILABLE_MODEL_IDS, build_agent_config_for_user,
    )

    valid_tiers = {t.value for t in ModelTier}
    if request.tier not in valid_tiers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid tier '{request.tier}'. Must be one of: {sorted(valid_tiers)}",
        )

    sanitised_custom: Optional[Dict[str, str]] = None
    if request.tier == ModelTier.CUSTOM.value and request.custom_config:
        valid_agent_keys = {a.key.value for a in AGENT_REGISTRY}
        sanitised_custom = {
            k: v
            for k, v in request.custom_config.items()
            if k in valid_agent_keys and v in AVAILABLE_MODEL_IDS
        }

    user.model_tier          = request.tier
    user.custom_model_config = (
        sanitised_custom if request.tier == ModelTier.CUSTOM.value else None
    )
    db.commit()

    resolved = build_agent_config_for_user(
        model_tier=request.tier,
        custom_model_config=sanitised_custom,
    )

    return {
        "success":         True,
        "tier":            request.tier,
        "resolved_models": resolved.models,
    }


# ─── API Key (BYOK) ───────────────────────────────────────────────────────────

class ApiKeyStatusResponse(BaseModel):
    has_key:    bool
    masked_key: Optional[str]
    key_source: str


class SaveApiKeyRequest(BaseModel):
    api_key: Optional[str] = None


async def _validate_openai_key_live(api_key: str) -> tuple[bool, str]:
    """
    Make a real lightweight call to the OpenAI API (/v1/models) to confirm
    the key is active. This call costs nothing — it only lists available models.

    Returns:
        (is_valid: bool, reason: str)

    Raises:
        Exception — if a non-auth error occurs (network, timeout), so the
                    caller can decide whether to save anyway.
    """
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        await client.models.list()
        return True, "ok"
    except Exception as exc:
        err = str(exc).lower()
        # Auth-specific errors — key is definitely wrong
        if any(x in err for x in ("invalid_api_key", "incorrect api key", "401", "authentication")):
            return False, "invalid"
        # Permission errors (key exists but restricted) — still treat as valid key
        if "403" in err or "permission" in err:
            return True, "restricted"
        # Network/timeout — re-raise so caller can handle
        raise


@router.get("/api-key", response_model=ApiKeyStatusResponse)
async def get_api_key_status(
    user = Depends(get_current_user),
):
    """
    Return whether the user has a personal API key stored.
    NEVER returns the raw key — only a masked preview and a boolean.
    """
    from app.core.crypto import SecretDecryptionError, decrypt_secret

    has_key = bool(user.openai_api_key)
    masked  = None
    if has_key:
        try:
            raw = decrypt_secret(user.openai_api_key)
            if len(raw) >= 8:
                masked = f"sk-...{raw[-4:]}"
        except SecretDecryptionError:
            # Unmigrated or re-keyed row — key exists but can't be previewed;
            # the user can re-save it from the UI.
            masked = None

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
    Validate and save the user's personal OpenAI API key.

    Flow:
      1. If empty / null  → clear stored key, return success
      2. Format check     → must start with sk-
      3. Live validation  → calls OpenAI /v1/models to confirm key is active
      4. If invalid       → return 422, nothing stored
      5. If valid         → store key, return is_valid=True + masked preview
      6. If network error → store key anyway, flag is_valid=null so UI can warn

    The UI uses is_valid to show "Validated ✓" (True), "Saved - unverified" (null),
    or refuse to save at all (False / 422).
    """
    raw_key = (request.api_key or "").strip()

    # ── Clear ──────────────────────────────────────────────────────────────────
    if not raw_key:
        user.openai_api_key = None
        db.commit()
        return {
            "success":  True,
            "is_valid": None,
            "has_key":  False,
            "message":  "API key cleared. Generations will use the shared system key.",
        }

    # ── Format check ───────────────────────────────────────────────────────────
    if not raw_key.startswith("sk-"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="API key must start with 'sk-'. Check the key and try again.",
        )

    # ── Live OpenAI validation ─────────────────────────────────────────────────
    try:
        is_valid, reason = await _validate_openai_key_live(raw_key)
    except Exception as network_exc:
        # Network / timeout error — save the key but flag as unverified
        print(f"   ⚠️  Key validation network error: {network_exc}")
        from app.core.crypto import encrypt_secret
        user.openai_api_key = encrypt_secret(raw_key)
        db.commit()
        masked = f"sk-...{raw_key[-4:]}"
        return {
            "success":    True,
            "is_valid":   None,          # unknown — network blocked validation
            "has_key":    True,
            "masked_key": masked,
            "message":    (
                "Key saved, but live validation could not complete (network issue). "
                "It will be tested on your next generation."
            ),
        }

    # ── Invalid key ────────────────────────────────────────────────────────────
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "This API key was rejected by OpenAI. "
                "Please check the key is correct and has not been revoked."
            ),
        )

    # ── Valid — save ───────────────────────────────────────────────────────────
    from app.core.crypto import encrypt_secret
    user.openai_api_key = encrypt_secret(raw_key)
    db.commit()
    masked = f"sk-...{raw_key[-4:]}"

    return {
        "success":    True,
        "is_valid":   True,
        "has_key":    True,
        "masked_key": masked,
        "message":    (
            "API key validated and saved successfully. "
            "Your generations will now use your personal OpenAI account."
        ),
    }