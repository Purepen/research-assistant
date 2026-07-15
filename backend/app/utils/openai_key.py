"""
OpenAI Key Utility
==================
File: backend/app/utils/openai_key.py

Resolves and sets the correct OpenAI API key before any Runner.run() call.

Why this exists:
  The OpenAI Agents SDK reads the key once from the environment at startup,
  OR from set_default_openai_key() before each call. Routes that call agents
  directly (topics, etc.) must set the key themselves — they don't go through
  research_service.py which does the key resolution for generation.

Usage:
  from app.utils.openai_key import apply_openai_key

  @router.post("/some-route")
  async def my_route(req, user=Depends(get_current_user)):
      apply_openai_key(user)   # ← call this before any agent call
      result = await run_something(...)
"""

from __future__ import annotations

import os


_TRUTHY = {"1", "true", "yes", "on"}


def _require_byok() -> bool:
    """
    True when this deployment must NEVER fall back to the system key.

    Set REQUIRE_BYOK=true in production (cloud) so every generation runs on the
    customer's own key. Leave unset/false for local development, where the
    owner's OPENAI_API_KEY in .env is the convenient default.
    """
    return os.environ.get("REQUIRE_BYOK", "").strip().lower() in _TRUTHY


def apply_openai_key(user, db_session=None, credit_kind: str | None = None) -> bool:
    """
    Resolve and set the active OpenAI API key for this request/run.

    Priority:
      1. User's own stored key (user.openai_api_key) — BYOK, always allowed,
         never rate-limited by the free trial below.
      2. System OPENAI_API_KEY environment variable — LOCAL-DEV / free-trial
         fallback only:
           - blocked outright when REQUIRE_BYOK=true (production posture)
           - otherwise gated by a one-time free-trial credit of `credit_kind`
             ("topic" or "spec" — see app/services/trial_service.py). Once
             spent, the user must add their own key. Pass credit_kind=None
             to skip trial gating (falls back to the REQUIRE_BYOK check only).

    Returns True if the user's own key was used, False if the system key was
    used. Raises RuntimeError if no usable key is available/allowed, so the
    caller can turn it into a clean 4xx rather than a cryptic 401 from inside
    the agent call.

    Args:
        user: The authenticated User ORM object from get_current_user().
        db_session: Required together with credit_kind to enforce/consume the
              free-trial credit; without it, trial gating is skipped.
        credit_kind: "topic" | "spec" | None — which free-trial credit this
              call should draw on.
    """
    from agents import set_default_openai_key

    # Priority 1: user's own saved key (stored encrypted — see app/core/crypto.py)
    if user and getattr(user, "openai_api_key", None):
        from app.core.crypto import decrypt_secret
        key = decrypt_secret(user.openai_api_key)
        print("   🔑 Using user key (BYOK)")
        set_default_openai_key(key)
        return True

    # Priority 2: system env var — blocked outright in strict deployments
    if _require_byok():
        raise RuntimeError(
            "This deployment requires your own OpenAI API key. "
            "Add it in Profile → Settings → API Key."
        )

    # Otherwise, the system key is a free-trial allowance, not an unlimited
    # fallback — spend (or check) the one-time credit before using it.
    if credit_kind is not None and user is not None and db_session is not None:
        from app.services.trial_service import consume_free_credit
        consume_free_credit(user, db_session, credit_kind)  # raises FreeTrialExhausted (a RuntimeError) if already spent

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError(
            "No OpenAI API key available. "
            "Set OPENAI_API_KEY in your .env file, "
            "or add your personal key in Profile → Settings → API Key."
        )

    print("   🔑 Using system .env key")
    set_default_openai_key(key)
    return False