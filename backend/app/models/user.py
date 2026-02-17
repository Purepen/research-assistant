"""
User Model - UPDATED with email/password fields
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Null if Google-only
    google_id = Column(String(255), unique=True, nullable=True)
    
    # Profile
    full_name = Column(String(255), nullable=False)
    
    # Email Verification
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    
    # Password Reset
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"
