"""
Encrypt existing plaintext BYOK keys in place (Bug #6 migration).

Idempotent: rows already encrypted with the active FERNET_KEY are skipped,
so the script can be re-run safely.

Run from backend/:
    uv run python scripts/encrypt_existing_keys.py
"""

import os
import sys

# Make `app` importable when run as a plain script from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.crypto import encrypt_secret, is_encrypted
from app.models.database import User


def main() -> None:
    database_url = os.getenv("DATABASE_URL", "sqlite:///./research_assistant.db")
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    engine = create_engine(database_url, connect_args=connect_args)
    session = sessionmaker(bind=engine)()

    try:
        users = session.query(User).filter(User.openai_api_key.isnot(None)).all()
        migrated, skipped = 0, 0

        for user in users:
            if is_encrypted(user.openai_api_key):
                skipped += 1
                continue
            user.openai_api_key = encrypt_secret(user.openai_api_key)
            migrated += 1

        session.commit()
        print(f"Done. {len(users)} rows with a stored key: "
              f"{migrated} encrypted, {skipped} already encrypted.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
