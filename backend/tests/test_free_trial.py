"""Free-trial credit tests.

Product rule: a user with no OpenAI key of their own gets exactly one free
Topic Lab action and one free specification generation on the shared system
key; after that, they must add their own key. Users with their own key are
never gated. See app/services/trial_service.py and app/utils/openai_key.py.
"""

from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import agents as agents_sdk
from app.models.database import Base, User
from app.services.trial_service import FreeTrialExhausted, consume_free_credit
from app.utils.openai_key import apply_openai_key


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _make_user(db_session, **overrides) -> User:
    user = User(
        email=overrides.pop("email", "student@example.com"),
        full_name="Test Student",
        email_verified=True,
        **overrides,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ── trial_service.consume_free_credit ─────────────────────────────────────────

def test_consume_free_credit_first_use_succeeds_and_persists(db_session):
    user = _make_user(db_session)
    assert user.free_topic_credit_used is False

    consume_free_credit(user, db_session, "topic")

    assert user.free_topic_credit_used is True
    db_session.refresh(user)
    assert user.free_topic_credit_used is True


def test_consume_free_credit_second_use_raises_and_does_not_reset(db_session):
    user = _make_user(db_session)
    consume_free_credit(user, db_session, "topic")

    with pytest.raises(FreeTrialExhausted, match="already been used"):
        consume_free_credit(user, db_session, "topic")

    # Still marked used, not reverted by the failed second attempt.
    assert user.free_topic_credit_used is True


def test_topic_and_spec_credits_are_independent(db_session):
    user = _make_user(db_session)
    consume_free_credit(user, db_session, "topic")

    assert user.free_spec_credit_used is False
    consume_free_credit(user, db_session, "spec")  # must not raise
    assert user.free_spec_credit_used is True


# ── apply_openai_key: free-trial gating ───────────────────────────────────────

def test_apply_openai_key_first_free_call_uses_system_key_and_spends_credit(monkeypatch, db_session):
    monkeypatch.delenv("REQUIRE_BYOK", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-system-key")
    captured = {}
    monkeypatch.setattr(agents_sdk, "set_default_openai_key", lambda k: captured.update(key=k))

    user = _make_user(db_session)
    used_own_key = apply_openai_key(user, db_session=db_session, credit_kind="topic")

    assert used_own_key is False
    assert captured["key"] == "sk-system-key"
    assert user.free_topic_credit_used is True


def test_apply_openai_key_blocks_after_free_credit_spent(monkeypatch, db_session):
    monkeypatch.delenv("REQUIRE_BYOK", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-system-key")
    monkeypatch.setattr(agents_sdk, "set_default_openai_key", lambda k: None)

    user = _make_user(db_session)
    apply_openai_key(user, db_session=db_session, credit_kind="spec")  # spends it

    with pytest.raises(RuntimeError, match="already been used"):
        apply_openai_key(user, db_session=db_session, credit_kind="spec")


def test_apply_openai_key_own_key_never_gated_even_if_credit_spent(monkeypatch, db_session):
    monkeypatch.delenv("REQUIRE_BYOK", raising=False)
    monkeypatch.setattr("app.core.crypto.decrypt_secret", lambda v: "sk-user-key")
    captured = {}
    monkeypatch.setattr(agents_sdk, "set_default_openai_key", lambda k: captured.update(key=k))

    user = _make_user(db_session, openai_api_key="encrypted-blob")
    user.free_spec_credit_used = True
    db_session.commit()

    used_own_key = apply_openai_key(user, db_session=db_session, credit_kind="spec")

    assert used_own_key is True
    assert captured["key"] == "sk-user-key"


def test_apply_openai_key_credit_kind_none_skips_trial_gating(monkeypatch, db_session):
    """Callers that don't pass credit_kind get the old unlimited-fallback
    behaviour (only REQUIRE_BYOK still applies) — e.g. scripts/tests."""
    monkeypatch.delenv("REQUIRE_BYOK", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-system-key")
    monkeypatch.setattr(agents_sdk, "set_default_openai_key", lambda k: None)

    user = _make_user(db_session)
    user.free_topic_credit_used = True
    db_session.commit()

    apply_openai_key(user, db_session=db_session, credit_kind=None)  # must not raise
    assert user.free_spec_credit_used is False  # untouched


def test_require_byok_blocks_even_with_free_credit_available(monkeypatch, db_session):
    monkeypatch.setenv("REQUIRE_BYOK", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-owner-key-should-never-be-used")

    user = _make_user(db_session)
    with pytest.raises(RuntimeError, match="requires your own OpenAI API key"):
        apply_openai_key(user, db_session=db_session, credit_kind="topic")

    # REQUIRE_BYOK blocks before the credit is ever touched.
    assert user.free_topic_credit_used is False


def test_apply_openai_key_without_db_session_skips_gating_but_still_needs_a_key(monkeypatch):
    monkeypatch.delenv("REQUIRE_BYOK", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    user = SimpleNamespace(openai_api_key=None)
    with pytest.raises(RuntimeError, match="No OpenAI API key available"):
        apply_openai_key(user, db_session=None, credit_kind="spec")
