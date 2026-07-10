"""Tests for app/core/crypto.py — BYOK key encryption (Bug #6)."""

import pytest
from cryptography.fernet import Fernet

from app.core.crypto import (
    FernetCipher,
    SecretDecryptionError,
    decrypt_secret,
    encrypt_secret,
    is_encrypted,
    reset_cipher,
)


@pytest.fixture(autouse=True)
def fernet_env(monkeypatch):
    """Give every test a fresh valid FERNET_KEY and a reset cipher singleton."""
    monkeypatch.setenv("FERNET_KEY", Fernet.generate_key().decode())
    reset_cipher()
    yield
    reset_cipher()


def test_round_trip():
    secret = "sk-proj-" + "x" * 156  # realistic long project key
    token = encrypt_secret(secret)
    assert token != secret
    assert decrypt_secret(token) == secret


def test_token_is_not_plaintext_prefixed():
    token = encrypt_secret("sk-abc123")
    assert not token.startswith("sk-")
    assert "sk-abc123" not in token


def test_is_encrypted_detects_tokens_and_plaintext():
    token = encrypt_secret("sk-abc123")
    assert is_encrypted(token) is True
    assert is_encrypted("sk-abc123") is False


def test_decrypt_plaintext_raises_decryption_error():
    with pytest.raises(SecretDecryptionError):
        decrypt_secret("sk-plaintext-row-from-before-migration")


def test_decrypt_with_wrong_key_raises_decryption_error(monkeypatch):
    token = encrypt_secret("sk-abc123")
    monkeypatch.setenv("FERNET_KEY", Fernet.generate_key().decode())
    reset_cipher()
    with pytest.raises(SecretDecryptionError):
        decrypt_secret(token)


def test_missing_key_fails_fast(monkeypatch):
    monkeypatch.delenv("FERNET_KEY")
    reset_cipher()
    with pytest.raises(RuntimeError, match="FERNET_KEY is not set"):
        encrypt_secret("sk-abc123")


def test_invalid_key_fails_fast():
    with pytest.raises(RuntimeError, match="not a valid Fernet key"):
        FernetCipher(key="not-a-fernet-key")


def test_secret_decryption_error_is_runtime_error():
    """apply_openai_key's contract: failures surface as RuntimeError → clean 500."""
    assert issubclass(SecretDecryptionError, RuntimeError)
