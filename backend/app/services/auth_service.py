"""
Auth Service - UPDATED with Email/Password

Complete authentication with:
- Email/Password registration
- Email verification
- Password reset
- Google OAuth (fixed)
"""

import os
import jwt
import secrets
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from google.oauth2 import id_token
from google.auth.transport import requests

from app.models.database import User, Project


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings — fail fast at startup: refusing to boot beats signing tokens
# with a guessable default (the "your-secret-key" fallback was Bug #7).
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "")
if len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET_KEY must be set to a secret of at least 32 characters "
        "(see backend/.env.example). Generate one with:\n"
        '  python -c "import secrets; print(secrets.token_urlsafe(48))"'
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


class AuthService:
    """Authentication service with email and Google OAuth"""
    
    def __init__(self):
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    # ====================
    # PASSWORD UTILITIES
    # ====================
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    # ====================
    # EMAIL/PASSWORD AUTH
    # ====================
    
    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        db_session
    ) -> Optional[User]:
        """
        Register new user with email/password
        
        Returns User object or None if email exists
        """
        
        # Check if user exists
        existing_user = db_session.query(User).filter(User.email == email).first()
        if existing_user:
            return None
        
        # Create user
        hashed_password = self.hash_password(password)
        verification_token = secrets.token_urlsafe(32)
        
        new_user = User(
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            email_verified=False,
            verification_token=verification_token,
            created_at=datetime.utcnow(),
            is_active=True
        )
        
        db_session.add(new_user)
        db_session.commit()
        db_session.refresh(new_user)
        
        return new_user
    
    async def authenticate_user(
        self,
        email: str,
        password: str,
        db_session
    ) -> Optional[User]:
        """
        Authenticate user with email/password
        
        Returns User object or None if invalid credentials
        """
        
        user = db_session.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        
        if not user.password_hash:
            return None  # User registered with Google only
        
        if not self.verify_password(password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db_session.commit()
        
        return user
    
    # ====================
    # EMAIL VERIFICATION
    # ====================
    
    async def verify_email(
        self,
        token: str,
        db_session
    ) -> bool:
        """Verify email with token"""
        
        user = db_session.query(User).filter(
            User.verification_token == token
        ).first()
        
        if not user:
            return False
        
        user.email_verified = True
        user.verification_token = None
        db_session.commit()
        
        return True
    
    async def resend_verification_email(
        self,
        email: str,
        db_session
    ) -> Optional[str]:
        """Generate new verification token"""
        
        user = db_session.query(User).filter(User.email == email).first()
        
        if not user or user.email_verified:
            return None
        
        new_token = secrets.token_urlsafe(32)
        user.verification_token = new_token
        db_session.commit()
        
        return new_token
    
    # ====================
    # PASSWORD RESET
    # ====================
    
    async def request_password_reset(
        self,
        email: str,
        db_session
    ) -> Optional[str]:
        """Generate password reset token"""
        
        user = db_session.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        
        reset_token = secrets.token_urlsafe(32)
        reset_expiry = datetime.utcnow() + timedelta(hours=1)
        
        user.reset_token = reset_token
        user.reset_token_expiry = reset_expiry
        db_session.commit()
        
        return reset_token
    
    async def reset_password(
        self,
        token: str,
        new_password: str,
        db_session
    ) -> bool:
        """Reset password with token"""
        
        user = db_session.query(User).filter(
            User.reset_token == token
        ).first()
        
        if not user:
            return False
        
        # Check token expiry
        if user.reset_token_expiry < datetime.utcnow():
            return False
        
        # Update password
        user.password_hash = self.hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db_session.commit()
        
        return True
    
    # ====================
    # GOOGLE OAUTH (FIXED)
    # ====================
    
    def verify_google_token(self, id_token_str: str) -> Optional[dict]:
        """Verify Google ID token"""
        
        try:
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                requests.Request(),
                self.google_client_id
            )
            
            return {
                "google_id": idinfo["sub"],
                "email": idinfo["email"],
                "full_name": idinfo.get("name", ""),
                "picture": idinfo.get("picture")
            }
        except Exception as e:
            print(f"Google token verification failed: {e}")
            return None
    
    async def authenticate_google_user(
        self,
        google_id: str,
        email: str,
        full_name: str,
        db_session
    ) -> Optional[User]:
        """Authenticate or create user from Google OAuth"""
        
        # Check if user exists
        user = db_session.query(User).filter(
            User.google_id == google_id
        ).first()
        
        if user:
            # Update last login
            user.last_login = datetime.utcnow()
            db_session.commit()
            return user
        
        # Check if email exists (merge accounts)
        user = db_session.query(User).filter(User.email == email).first()
        
        if user:
            # Link Google account
            user.google_id = google_id
            user.email_verified = True  # Google email is verified
            user.last_login = datetime.utcnow()
            db_session.commit()
            return user
        
        # Create new user
        new_user = User(
            email=email,
            google_id=google_id,
            full_name=full_name,
            email_verified=True,
            created_at=datetime.utcnow(),
            is_active=True
        )
        
        db_session.add(new_user)
        db_session.commit()
        db_session.refresh(new_user)
        
        return new_user
    
    # ====================
    # JWT TOKENS
    # ====================
    
    def create_access_token(self, user_id: int, email: str) -> str:
        """Create JWT access token"""
        
        payload = {
            "user_id": user_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token"""
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    
    def check_user_permission(
        self,
        user: User,
        project_id: int,
        db_session
    ) -> bool:
        """Check whether a user can access a project."""

        if not db_session:
            return False

        project = db_session.query(Project).filter(Project.id == project_id).first()
        if not project:
            return False

        return project.user_id == user.id
    
    def get_current_user(self, token: str, db_session) -> Optional[User]:
        """Get user from JWT token"""
        
        payload = self.verify_token(token)
        
        if not payload:
            return None
        
        user = db_session.query(User).filter(
            User.id == payload["user_id"]
        ).first()
        
        return user
