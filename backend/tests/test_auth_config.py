"""Regression tests for Bug #7: JWT_SECRET_KEY had an insecure hardcoded
fallback ("your-secret-key") and no startup enforcement."""

import importlib

import pytest

import app.services.auth_service as auth_service


def _reload_with(monkeypatch, value):
    if value is None:
        monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    else:
        monkeypatch.setenv("JWT_SECRET_KEY", value)
    return importlib.reload(auth_service)


@pytest.fixture(autouse=True)
def restore_module(monkeypatch):
    yield
    # Re-import with the conftest-provided secret so later tests see a valid module
    monkeypatch.setenv("JWT_SECRET_KEY", "pytest-only-secret-key-0123456789abcdef")
    importlib.reload(auth_service)


def test_missing_secret_fails_fast(monkeypatch):
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        _reload_with(monkeypatch, None)


def test_short_secret_fails_fast(monkeypatch):
    with pytest.raises(RuntimeError, match="at least 32 characters"):
        _reload_with(monkeypatch, "too-short")


def test_valid_secret_boots_and_is_used(monkeypatch):
    module = _reload_with(monkeypatch, "a" * 32)
    assert module.JWT_SECRET == "a" * 32
