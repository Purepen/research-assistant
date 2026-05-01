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


def apply_openai_key(user) -> None:
    """
    Resolve and set the active OpenAI API key for this request.

    Priority:
      1. User's own stored key (user.openai_api_key) — BYOK
      2. System OPENAI_API_KEY environment variable — fallback

    Raises RuntimeError if neither is available, so the route returns
    a clean 500 rather than a cryptic 401 from inside the agent call.

    Args:
        user: The authenticated User ORM object from get_current_user().
              If None (shouldn't happen in authenticated routes), falls back
              to the env var.
    """
    from agents import set_default_openai_key

    key: str | None = None

    # Priority 1: user's own saved key
    if user and getattr(user, "openai_api_key", None):
        key = user.openai_api_key
        print(f"   🔑 Using user key (sk-...{key[-4:]})")

    # Priority 2: system env var
    if not key:
        key = os.environ.get("OPENAI_API_KEY")
        if key:
            print(f"   🔑 Using system .env key")

    if not key:
        raise RuntimeError(
            "No OpenAI API key available. "
            "Set OPENAI_API_KEY in your .env file, "
            "or add your personal key in Profile → Settings → API Key."
        )

    set_default_openai_key(key)