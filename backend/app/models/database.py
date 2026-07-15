"""
Database Models
===============

Complete SQLAlchemy models with ALL required fields.

Fix applied (Feb 2026):
  Replaced the broken Enum(values_callable=...) column with a
  CaseInsensitiveEnum TypeDecorator backed by a plain String column.

Phase 1 Addition (Mar 2026):
  Added TopicSession model — persists every completed topic from the
  Topic Lab to the database, linked to the user.
  User.topic_sessions relationship added.

Model Tier Addition (Apr 2026):
  Two new columns on User:
    model_tier          — which tier the user has selected (testing / production / custom)
    custom_model_config — JSON dict mapping agent_key → model_id for CUSTOM tier
  These columns have safe defaults so no migration data backfill is needed.

API Key Addition (Apr 2026):
  One new column on User:
    openai_api_key — user's own OpenAI API key, stored as a Fernet token
                     (see app/core/crypto.py). Never store or log plaintext.

Critic Addition (Apr 2026):
  One new column on ProjectResult:
    critic_json — JSON — stores the brutal critic agent analysis.
                  Shape: {"text": str, "generated_at": ISO str}
                  Nullable — old results without critic analysis show a placeholder.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, TypeDecorator
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# ---------------------------------------------------------------------------
# Enum definitions
# ---------------------------------------------------------------------------

class ProjectStatus(enum.Enum):
    """Project lifecycle states — values are always lowercase strings."""
    DRAFT      = "draft"
    QUEUED     = "queued"
    GENERATING = "generating"
    REVIEWING  = "reviewing"
    COMPLETE   = "complete"
    FAILED     = "failed"


class TopicOrigin(enum.Enum):
    """How the topic was arrived at."""
    DISCOVERED = "discovered"
    VETTED     = "vetted"
    PROVIDED   = "provided"


# ---------------------------------------------------------------------------
# Custom TypeDecorator — case-insensitive enum storage
# ---------------------------------------------------------------------------

class CaseInsensitiveEnum(TypeDecorator):
    """
    Stores enum VALUES as plain VARCHAR and handles reading both uppercase
    and lowercase strings from the DB.
    """

    impl       = String(50)
    cache_ok   = True

    def __init__(self, enum_class: type[enum.Enum], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_class = enum_class
        self._lookup: dict[str, enum.Enum] = {}
        for member in enum_class:
            self._lookup[member.value.lower()] = member
            self._lookup[member.name.lower()]  = member

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value
        if isinstance(value, str):
            lower  = value.lower()
            member = self._lookup.get(lower)
            if member:
                return member.value
            raise ValueError(
                f"'{value}' is not a valid {self.enum_class.__name__}. "
                f"Valid values: {[m.value for m in self.enum_class]}"
            )
        raise TypeError(f"Cannot convert {type(value)} to {self.enum_class.__name__}")

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        lower  = value.lower()
        member = self._lookup.get(lower)
        if member is None:
            raise LookupError(
                f"'{value}' is not a recognised {self.enum_class.__name__} value. "
                f"Valid values: {[m.value for m in self.enum_class]}"
            )
        return member


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    """User accounts — email/password + Google OAuth."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    google_id     = Column(String(255), unique=True, nullable=True)
    full_name     = Column(String(255), nullable=False)

    # Email verification
    email_verified     = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)

    # Password reset
    reset_token        = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # ── Model tier settings (Apr 2026) ────────────────────────────────────────
    model_tier          = Column(String(20), default="production", nullable=False, server_default="production")
    custom_model_config = Column(JSON, nullable=True)

    # ── User's own OpenAI API key (Apr 2026) ──────────────────────────────────
    # Text, not String(255): a Fernet token of a long sk-proj- key exceeds 255 chars
    openai_api_key = Column(Text, nullable=True)

    # ── Free-trial credits (Jul 2026) ─────────────────────────────────────────
    # Users with no key of their own get exactly one free Topic Lab action and
    # one free specification generation on the shared system key. See
    # app/services/trial_service.py. Irrelevant once the user has their own key.
    free_topic_credit_used = Column(Boolean, default=False, nullable=False, server_default="0")
    free_spec_credit_used  = Column(Boolean, default=False, nullable=False, server_default="0")

    # Relationships
    projects       = relationship("Project",      back_populates="user", cascade="all, delete-orphan")
    topic_sessions = relationship("TopicSession", back_populates="user", cascade="all, delete-orphan",
                                  order_by="TopicSession.created_at.desc()")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"


class TopicSession(Base):
    """
    A completed topic discovery or vetting session.

    One row is created automatically whenever a user finalises a topic.
    """
    __tablename__ = "topic_sessions"

    id      = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # ── The finalised topic ─────────────────────────────────────────────────
    final_topic       = Column(Text, nullable=False)
    description       = Column(Text, nullable=True)
    field             = Column(String(255), nullable=False)
    degree_level      = Column(String(10),  nullable=False)
    academic_level    = Column(String(10),  nullable=True)

    # ── Context captured during the session ────────────────────────────────
    original_topic    = Column(Text, nullable=True)
    project_type      = Column(String(50), nullable=True)
    ambition_level    = Column(String(50), nullable=True)
    geographic_focus  = Column(String(50), nullable=True)

    # ── How the topic came to exist ─────────────────────────────────────────
    origin = Column(
        CaseInsensitiveEnum(TopicOrigin),
        default=TopicOrigin.DISCOVERED,
        nullable=False,
    )

    # ── Resources found during scouting ─────────────────────────────────────
    scout_data_json   = Column(JSON, nullable=True)

    # ── Link to spec if the user went on to generate one ────────────────────
    linked_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # ── Timestamps ──────────────────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # ── Relationships ────────────────────────────────────────────────────────
    user           = relationship("User",    back_populates="topic_sessions")
    linked_project = relationship("Project", foreign_keys=[linked_project_id])

    def __repr__(self):
        return f"<TopicSession(id={self.id}, user_id={self.user_id}, topic='{self.final_topic[:40]}')>"


class Project(Base):
    """Research specification projects."""
    __tablename__ = "projects"

    id      = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Configuration
    field_of_study      = Column(String(255), nullable=False)
    research_topic      = Column(Text, nullable=True)
    academic_level      = Column(String(10),  nullable=False)
    effort_level        = Column(String(10),  nullable=False)
    past_projects_mode  = Column(String(20),  nullable=False)

    # ── Status ──────────────────────────────────────────────────────────────
    status = Column(
        CaseInsensitiveEnum(ProjectStatus),
        default=ProjectStatus.DRAFT,
        nullable=False,
        index=True,
    )

    progress_percentage = Column(Integer, default=0)
    current_phase       = Column(String(50), nullable=True)

    # Timestamps
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at   = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # File storage
    guidelines_file_path = Column(String(500), nullable=True)
    user_dumps_paths     = Column(JSON, nullable=True)

    # Results
    result_id = Column(Integer, ForeignKey("project_results.id"), nullable=True)

    # ── Optional back-link to originating topic session ─────────────────────
    topic_session_id = Column(Integer, ForeignKey("topic_sessions.id"), nullable=True)

    # Relationships
    user      = relationship("User",             back_populates="projects")
    result    = relationship("ProjectResult",    back_populates="project",  uselist=False)
    analytics = relationship("ProjectAnalytics", back_populates="project",  uselist=False)

    def __repr__(self):
        return f"<Project(id={self.id}, status={self.status}, field='{self.field_of_study}')>"


class ProjectResult(Base):
    """Generated specification results."""
    __tablename__ = "project_results"

    id = Column(Integer, primary_key=True, index=True)

    # Specification
    specification_json         = Column(JSON, nullable=False)
    synthesis_json             = Column(JSON, nullable=True)

    # Review
    final_review_json          = Column(JSON, nullable=True)
    total_marks                = Column(Integer, nullable=True)
    decision                   = Column(String(50), nullable=True)

    # ── Critic analysis (Apr 2026) ────────────────────────────────────────────
    # Stored as {"text": str, "generated_at": ISO str}
    # Nullable so existing rows without critic data continue to work.
    critic_json                = Column(JSON, nullable=True)

    # Resources
    discovered_resources_json  = Column(JSON, nullable=True)
    analyzed_projects_json     = Column(JSON, nullable=True)

    # Files
    docx_file_path             = Column(String(500), nullable=True)
    pdf_file_path              = Column(String(500), nullable=True)

    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="result")

    def __repr__(self):
        return f"<ProjectResult(id={self.id}, marks={self.total_marks})>"


class ProjectAnalytics(Base):
    """Analytics and metrics per project."""
    __tablename__ = "project_analytics"

    id         = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)

    # Metrics
    num_iterations              = Column(Integer, default=0)
    num_web_searches            = Column(Integer, default=0)
    num_auto_projects_found     = Column(Integer, default=0)
    num_user_projects_analyzed  = Column(Integer, default=0)

    # Word counts
    final_word_count  = Column(Integer, nullable=True)
    target_word_count = Column(Integer, nullable=True)

    # Time metrics (seconds)
    total_generation_time = Column(Integer, nullable=True)
    phase1_time           = Column(Integer, nullable=True)
    phase2_time           = Column(Integer, nullable=True)
    phase3_time           = Column(Integer, nullable=True)
    phase4_time           = Column(Integer, nullable=True)
    phase5_time           = Column(Integer, nullable=True)

    # Quality
    completeness_score = Column(Integer, nullable=True)
    novelty_score      = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="analytics")

    def __repr__(self):
        return f"<ProjectAnalytics(project_id={self.project_id})>"