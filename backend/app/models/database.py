"""
Database Models - FIXED

Complete SQLAlchemy models with ALL required fields
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class ProjectStatus(enum.Enum):
    """Project lifecycle states"""
    DRAFT = "draft"
    QUEUED = "queued"
    GENERATING = "generating"
    REVIEWING = "reviewing"
    COMPLETE = "complete"
    FAILED = "failed"


class User(Base):
    """User accounts with email/password + Google OAuth"""
    __tablename__ = "users"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # NULL if Google-only user
    google_id = Column(String(255), unique=True, nullable=True)
    
    # Profile
    full_name = Column(String(255), nullable=False)
    
    # Email verification
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    
    # Password reset - THESE WERE MISSING!
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)  # ← THIS WAS MISSING!
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    """Research specification projects"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Configuration
    field_of_study = Column(String(255), nullable=False)
    research_topic = Column(Text, nullable=True)
    academic_level = Column(String(10), nullable=False)  # BSc, MSc, PhD
    effort_level = Column(String(10), nullable=False)  # low, medium, high
    past_projects_mode = Column(String(20), nullable=False)  # user_provided, auto_discover, hybrid
    
    # Status tracking
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False, index=True)
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


class ProjectResult(Base):
    """Generated specification results"""
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


class ProjectAnalytics(Base):
    """Analytics and metrics"""
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