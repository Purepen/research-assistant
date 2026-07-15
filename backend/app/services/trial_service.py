"""
Free-Trial Credit Tracking
==========================
File: backend/app/services/trial_service.py

Product rule: a user with no OpenAI key of their own gets exactly one free
Topic Lab action (discover/scout/refine/vet/find-projects — whichever they
call first) and one free full specification generation, both running on the
shared system key. After a credit is spent, that action requires the user's
own key. Users who've added their own key are never gated by this at all —
it's their own spend, not the deployment's.

This is orthogonal to REQUIRE_BYOK (app/utils/openai_key.py): REQUIRE_BYOK is
a deployment-wide "never touch the system key, full stop" switch; this module
is the one-time allowance that applies when REQUIRE_BYOK is off.
"""

from __future__ import annotations

from typing import Literal

CreditKind = Literal["topic", "spec"]

_FIELD_BY_KIND = {
    "topic": "free_topic_credit_used",
    "spec":  "free_spec_credit_used",
}

_LABEL_BY_KIND = {
    "topic": "Topic Lab action",
    "spec":  "specification generation",
}


class FreeTrialExhausted(RuntimeError):
    """Raised when a user with no BYOK key has already used their free credit."""


def consume_free_credit(user, db_session, kind: CreditKind) -> None:
    """
    Consume the one-time free credit of the given kind for `user`.

    Raises FreeTrialExhausted (without modifying anything) if it has already
    been used. Safe to call before the credit is spent — marks it spent and
    commits.
    """
    field = _FIELD_BY_KIND[kind]
    if getattr(user, field):
        raise FreeTrialExhausted(
            f"Your free trial {_LABEL_BY_KIND[kind]} has already been used. "
            "Add your own OpenAI API key in Profile → Settings → API Key to continue."
        )
    setattr(user, field, True)
    db_session.commit()
