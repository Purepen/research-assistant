"""
MIGRATION SCRIPT: Fix ProjectStatus enum case mismatch
=======================================================

Problem:
  The 'projects' table has rows with UPPERCASE status values (e.g., 'DRAFT')
  but the SQLAlchemy model expects lowercase values (e.g., 'draft').

Solution:
  Convert all uppercase/mixed-case status values to lowercase.

Usage:
  1. Place this file in your backend/ directory (same level as app/)
  2. Run: python migrate_enum_fix.py
  3. Restart your FastAPI server

Supports both SQLite and PostgreSQL.
"""

import os
import sys
import sqlite3
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./research_assistant.db")

# All valid enum values (lowercase — the canonical form)
VALID_STATUSES = {"draft", "queued", "generating", "reviewing", "complete", "failed"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run_sqlite_migration(db_path: str):
    """Fix enum values in a SQLite database."""
    log.info(f"Connecting to SQLite database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Inspect current values
        cursor.execute("SELECT id, status FROM projects")
        rows = cursor.fetchall()

        if not rows:
            log.info("No rows found in projects table. Nothing to migrate.")
            return

        log.info(f"Found {len(rows)} project row(s). Inspecting status values...")

        needs_fix = []
        unknown = []

        for project_id, status in rows:
            if status is None:
                continue
            lower = status.lower()
            if lower != status:          # uppercase or mixed case
                if lower in VALID_STATUSES:
                    needs_fix.append((project_id, status, lower))
                else:
                    unknown.append((project_id, status))
            # already lowercase — fine

        if unknown:
            log.warning(
                f"Found {len(unknown)} row(s) with UNRECOGNISED status values "
                f"(won't touch): {unknown}"
            )

        if not needs_fix:
            log.info("All status values are already lowercase. No migration needed! ✅")
            conn.close()
            return

        log.info(f"Will fix {len(needs_fix)} row(s):")
        for project_id, old, new in needs_fix:
            log.info(f"  Project #{project_id}: '{old}' → '{new}'")

        # 2. Apply fixes
        for project_id, old, new in needs_fix:
            cursor.execute(
                "UPDATE projects SET status = ? WHERE id = ? AND status = ?",
                (new, project_id, old),
            )

        conn.commit()
        log.info(f"✅ Migration complete. Fixed {len(needs_fix)} row(s).")

    except Exception as e:
        conn.rollback()
        log.error(f"Migration FAILED: {e}")
        raise
    finally:
        conn.close()


def run_postgres_migration(db_url: str):
    """Fix enum values in a PostgreSQL database."""
    try:
        import psycopg2
    except ImportError:
        log.error("psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    log.info("Connecting to PostgreSQL...")
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, status::text FROM projects")
        rows = cursor.fetchall()

        if not rows:
            log.info("No rows found. Nothing to migrate.")
            conn.close()
            return

        needs_fix = []
        for project_id, status in rows:
            if status is None:
                continue
            lower = status.lower()
            if lower != status and lower in VALID_STATUSES:
                needs_fix.append((project_id, status, lower))

        if not needs_fix:
            log.info("All status values are already lowercase. ✅")
            conn.close()
            return

        log.info(f"Will fix {len(needs_fix)} row(s):")
        for project_id, old, new in needs_fix:
            log.info(f"  Project #{project_id}: '{old}' → '{new}'")

        for project_id, old, new in needs_fix:
            cursor.execute(
                "UPDATE projects SET status = %s WHERE id = %s",
                (new, project_id),
            )

        conn.commit()
        log.info(f"✅ Migration complete. Fixed {len(needs_fix)} row(s).")

    except Exception as e:
        conn.rollback()
        log.error(f"Migration FAILED: {e}")
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    print("Migrating enum values...")
    url = DATABASE_URL
    log.info(f"DATABASE_URL = {url}")

    if url.startswith("sqlite"):
        # Extract file path from sqlite:///./path or sqlite:////abs/path
        db_path = url.replace("sqlite:///", "")
        if not db_path:
            db_path = "./research_assistant.db"
        run_sqlite_migration(db_path)

    elif url.startswith("postgresql") or url.startswith("postgres"):
        run_postgres_migration(url)

    else:
        log.error(f"Unsupported database URL scheme: {url}")
        sys.exit(1)


if __name__ == "__main__":
    main()