"""Tests for AuthService — password hashing, JWT round trips, registration."""

from datetime import datetime, timedelta

import jwt as pyjwt
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.services.auth_service as auth_module
from app.models.database import Base, User
from app.services.auth_service import AuthService


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


@pytest.fixture()
def service():
    return AuthService()


# ── Passwords ─────────────────────────────────────────────────────────────────

def test_password_hash_round_trip(service):
    hashed = service.hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert service.verify_password("correct horse battery staple", hashed)
    assert not service.verify_password("wrong password", hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────

def test_token_round_trip(service):
    token = service.create_access_token(user_id=42, email="a@b.com")
    payload = service.verify_token(token)
    assert payload is not None
    assert payload["user_id"] == 42
    assert payload["email"] == "a@b.com"


def test_expired_token_rejected(service):
    expired = pyjwt.encode(
        {"user_id": 1, "email": "a@b.com",
         "exp": datetime.utcnow() - timedelta(hours=1)},
        auth_module.JWT_SECRET,
        algorithm=auth_module.JWT_ALGORITHM,
    )
    assert service.verify_token(expired) is None


def test_garbage_token_rejected(service):
    assert service.verify_token("not.a.token") is None


def test_token_signed_with_other_secret_rejected(service):
    forged = pyjwt.encode(
        {"user_id": 1, "email": "a@b.com",
         "exp": datetime.utcnow() + timedelta(hours=1)},
        "attacker-controlled-secret-0123456789ab",
        algorithm=auth_module.JWT_ALGORITHM,
    )
    assert service.verify_token(forged) is None


# ── Registration / lookup ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_and_get_current_user(service, db_session):
    user = await service.register_user(
        email="student@example.com",
        password="a-strong-password",
        full_name="Test Student",
        db_session=db_session,
    )
    assert user is not None
    assert user.password_hash != "a-strong-password"

    token = service.create_access_token(user_id=user.id, email=user.email)
    fetched = service.get_current_user(token, db_session)
    assert fetched is not None
    assert fetched.id == user.id


@pytest.mark.asyncio
async def test_duplicate_registration_returns_none(service, db_session):
    first = await service.register_user(
        email="dup@example.com", password="pw123456", full_name="One",
        db_session=db_session,
    )
    assert first is not None
    second = await service.register_user(
        email="dup@example.com", password="pw123456", full_name="Two",
        db_session=db_session,
    )
    assert second is None
