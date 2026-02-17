"""
Database Models
===============

Complete SQLAlchemy models with ALL required fields.

Fix applied (Feb 2026):
  Replaced the broken Enum(values_callable=...) column with a
  CaseInsensitiveEnum TypeDecorator backed by a plain String column.
  This means the column now:
    - Writes: always stores the lowercase enum VALUE  (e.g. 'draft')
    - Reads:  handles BOTH 'draft' AND 'DRAFT' transparently
  This makes the application immune to any future case-mismatch issues
  while also fixing all existing rows once the migrate_enum_fix.py
  migration script has been run.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, TypeDecorator
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# ---------------------------------------------------------------------------
# Enum definition
# ---------------------------------------------------------------------------

class ProjectStatus(enum.Enum):
    """Project lifecycle states — values are always lowercase strings."""
    DRAFT = "draft"
    QUEUED = "queued"
    GENERATING = "generating"
    REVIEWING = "reviewing"
    COMPLETE = "complete"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# Custom TypeDecorator — the core of the fix
# ---------------------------------------------------------------------------

class CaseInsensitiveEnum(TypeDecorator):
    """
    A SQLAlchemy TypeDecorator that stores enum VALUES as plain VARCHAR
    and handles reading BOTH uppercase and lowercase strings from the DB.

    Why this is better than SQLAlchemy's built-in Enum type:
      - No dependency on database-level ENUM types (works with SQLite & Postgres)
      - Case-insensitive deserialization: 'DRAFT' and 'draft' both map correctly
      - Always serializes to the canonical lowercase value on writes
    """

    impl = String(50)
    cache_ok = True

    def __init__(self, enum_class: type[enum.Enum], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_class = enum_class
        # Build a case-insensitive lookup: lowercase-value → enum member
        self._lookup: dict[str, enum.Enum] = {}
        for member in enum_class:
            self._lookup[member.value.lower()] = member
            self._lookup[member.name.lower()] = member  # also accept 'draft' == DRAFT.name

    def process_bind_param(self, value, dialect):
        """Python → DB: always store the canonical lowercase value string."""
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value  # e.g. 'draft'
        if isinstance(value, str):
            lower = value.lower()
            member = self._lookup.get(lower)
            if member:
                return member.value
            raise ValueError(
                f"'{value}' is not a valid {self.enum_class.__name__}. "
                f"Valid values: {[m.value for m in self.enum_class]}"
            )
        raise TypeError(f"Cannot convert {type(value)} to {self.enum_class.__name__}")

    def process_result_value(self, value, dialect):
        """DB → Python: convert stored string back to enum member (case-insensitive)."""
        if value is None:
            return None
        lower = value.lower()
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

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)   # NULL for Google-only users
    google_id = Column(String(255), unique=True, nullable=True)

    # Profile
    full_name = Column(String(255), nullable=False)

    # Email verification
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)

    # Password reset
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"


class Project(Base):
    """Research specification projects."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Configuration
    field_of_study = Column(String(255), nullable=False)
    research_topic = Column(Text, nullable=True)
    academic_level = Column(String(10), nullable=False)    # BSc, MSc, PhD
    effort_level = Column(String(10), nullable=False)      # low, medium, high
    past_projects_mode = Column(String(20), nullable=False) # user_provided, auto_discover, hybrid

    # -----------------------------------------------------------------------
    # Status column — uses CaseInsensitiveEnum TypeDecorator (the fix!)
    # -----------------------------------------------------------------------
    status = Column(
        CaseInsensitiveEnum(ProjectStatus),
        default=ProjectStatus.DRAFT,
        nullable=False,
        index=True,
    )

    progress_percentage = Column(Integer, default=0)
    current_phase = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # File storage
    guidelines_file_path = Column(String(500), nullable=True)
    user_dumps_paths = Column(JSON, nullable=True)

    # Results
    result_id = Column(Integer, ForeignKey("project_results.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="projects")
    result = relationship("ProjectResult", back_populates="project", uselist=False)
    analytics = relationship("ProjectAnalytics", back_populates="project", uselist=False)

    def __repr__(self):
        return f"<Project(id={self.id}, status={self.status}, field='{self.field_of_study}')>"


class ProjectResult(Base):
    """Generated specification results."""
    __tablename__ = "project_results"

    id = Column(Integer, primary_key=True, index=True)

    # Specification
    specification_json = Column(JSON, nullable=False)
    synthesis_json = Column(JSON, nullable=True)

    # Review
    final_review_json = Column(JSON, nullable=True)
    total_marks = Column(Integer, nullable=True)
    decision = Column(String(50), nullable=True)

    # Resources
    discovered_resources_json = Column(JSON, nullable=True)
    analyzed_projects_json = Column(JSON, nullable=True)

    # Files
    docx_file_path = Column(String(500), nullable=True)
    pdf_file_path = Column(String(500), nullable=True)

    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="result")

    def __repr__(self):
        return f"<ProjectResult(id={self.id}, marks={self.total_marks})>"


class ProjectAnalytics(Base):
    """Analytics and metrics per project."""
    __tablename__ = "project_analytics"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)

    # Metrics
    num_iterations = Column(Integer, default=0)
    num_web_searches = Column(Integer, default=0)
    num_auto_projects_found = Column(Integer, default=0)
    num_user_projects_analyzed = Column(Integer, default=0)

    # Word counts
    final_word_count = Column(Integer, nullable=True)
    target_word_count = Column(Integer, nullable=True)

    # Time metrics (seconds)
    total_generation_time = Column(Integer, nullable=True)
    phase1_time = Column(Integer, nullable=True)
    phase2_time = Column(Integer, nullable=True)
    phase3_time = Column(Integer, nullable=True)
    phase4_time = Column(Integer, nullable=True)
    phase5_time = Column(Integer, nullable=True)

    # Quality
    completeness_score = Column(Integer, nullable=True)
    novelty_score = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="analytics")

    def __repr__(self):
        return f"<ProjectAnalytics(project_id={self.project_id})>"