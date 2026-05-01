"""
migrate.py
==========
Run this once from the backend folder to apply all pending DB schema changes.

  python migrate.py

Safe to run multiple times — each ALTER is wrapped in try/except so already-
existing columns are skipped silently.
"""

from sqlalchemy import create_engine, text

engine = create_engine("""sqlite:///./research_assistant.db""")

migrations = [
    # Apr 2026 — Model Tier + BYOK
    ("""ALTER TABLE users ADD COLUMN model_tier VARCHAR(20) NOT NULL DEFAULT 'production'""",  "users.model_tier"),
    ("""ALTER TABLE users ADD COLUMN custom_model_config JSON""",                              "users.custom_model_config"),
    ("""ALTER TABLE users ADD COLUMN openai_api_key VARCHAR(255)""",                           "users.openai_api_key"),

    # Apr 2026 — Critic Analysis
    ("""ALTER TABLE project_results ADD COLUMN critic_json JSON""",                            "project_results.critic_json"),
]

with engine.connect() as conn:
    for sql, label in migrations:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"Added   {label}")
        except Exception as e:
            msg = str(e).lower()
            if "duplicate column" in msg or "already exists" in msg:
                print(f"Exists  {label} (skipped)")
            else:
                print(f"FAILED  {label}: {e}")

print("\nDone.")