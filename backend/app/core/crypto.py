"""
Secret encryption for stored credentials (Bug #6)
==================================================

User BYOK OpenAI keys were stored in plaintext despite the model docstring
claiming encryption. This module provides the cipher used by every read/write
of User.openai_api_key.

SecretCipher is a Protocol so the Fernet implementation can be swapped for a
KMS-backed one in the cloud deployment without touching call sites.

Key management:
  FERNET_KEY environment variable (backend/.env locally). Generate one with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  Losing the key makes stored secrets unrecoverable — users must re-save them.

Existing plaintext rows are migrated by scripts/encrypt_existing_keys.py.
"""

from __future__ import annotations

import os
from typing import Optional, Protocol

from cryptography.fernet import Fernet, InvalidToken


class SecretDecryptionError(RuntimeError):
    """A stored secret could not be decrypted with the active FERNET_KEY —
    either the row predates encryption (run scripts/encrypt_existing_keys.py)
    or the key changed. Callers must not treat the raw value as a secret."""


class SecretCipher(Protocol):
    def encrypt(self, plaintext: str) -> str: ...
    def decrypt(self, token: str) -> str: ...


class FernetCipher:
    """Symmetric cipher keyed by the FERNET_KEY environment variable.

    Fails fast: constructing without a valid key raises RuntimeError so a
    misconfigured deployment breaks loudly instead of storing plaintext.
    """

    def __init__(self, key: Optional[str] = None):
        key = key or os.environ.get("FERNET_KEY")
        if not key:
            raise RuntimeError(
                "FERNET_KEY is not set. Generate one with:\n"
                "  python -c \"from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\"\n"
                "and add it to backend/.env"
            )
        try:
            self._fernet = Fernet(key.encode())
        except (ValueError, TypeError) as exc:
            raise RuntimeError(f"FERNET_KEY is not a valid Fernet key: {exc}") from exc

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, token: str) -> str:
        try:
            return self._fernet.decrypt(token.encode()).decode()
        except InvalidToken as exc:
            raise SecretDecryptionError(
                "Stored secret is not decryptable with the current FERNET_KEY. "
                "Run backend/scripts/encrypt_existing_keys.py to migrate plaintext "
                "rows, or have the user re-save the key."
            ) from exc


# ── Module-level default cipher ───────────────────────────────────────────────

_cipher: Optional[SecretCipher] = None


def get_cipher() -> SecretCipher:
    global _cipher
    if _cipher is None:
        _cipher = FernetCipher()
    return _cipher


def reset_cipher() -> None:
    """Force re-reading FERNET_KEY on the next get_cipher() call (tests)."""
    global _cipher
    _cipher = None


def encrypt_secret(plaintext: str) -> str:
    return get_cipher().encrypt(plaintext)


def decrypt_secret(token: str) -> str:
    """Raises SecretDecryptionError if the value was not encrypted with the
    active FERNET_KEY (e.g. an unmigrated plaintext row)."""
    return get_cipher().decrypt(token)


def is_encrypted(value: str) -> bool:
    """True if the value is a token decryptable with the active FERNET_KEY."""
    try:
        get_cipher().decrypt(value)
        return True
    except SecretDecryptionError:
        return False
