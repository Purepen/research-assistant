"""
Auth Routes — FIXED

Bug fixes:
  1. /register no longer returns an access_token. It returns a plain message
     so the frontend cannot log in until the user verifies their email.

  2. /login now rejects unverified accounts with a clear 403 error so the
     frontend can show "please verify your email" rather than a generic failure.

  3. /google endpoint fully working — creates/merges user by google_id or email.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.services.auth_service import AuthService
from app.models.database import User
from app.api.dependencies import get_db_session
from app.adapters.email_adapter import get_email_adapter

router       = APIRouter(prefix="/auth", tags=["Authentication"])
security     = HTTPBearer()
auth_service = AuthService()


# ── Request models ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str
    full_name: str

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class GoogleSignInRequest(BaseModel):
    id_token: str

class VerifyEmailRequest(BaseModel):
    token: str

class RequestPasswordResetRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str


# ── Response models ───────────────────────────────────────────────────────────

class AuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         dict

class MessageResponse(BaseModel):
    message: str

class RegisterResponse(BaseModel):
    """
    Returned after registration.
    Deliberately contains NO access_token so the frontend cannot silently
    log the user in before they verify their email.
    """
    message:              str
    email:                str
    requires_verification: bool = True

class UserResponse(BaseModel):
    id:             int
    email:          str
    full_name:      str
    email_verified: bool
    created_at:     str


# ── EMAIL / PASSWORD AUTH ─────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    request:          RegisterRequest,
    background_tasks: BackgroundTasks,
    db               = Depends(get_db_session),
):
    """
    Register a new user.

    • Creates the account with email_verified=False
    • Sends a verification email in the background
    • Returns a plain message — NO access_token
      (user must verify before they can log in)
    """
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    user = await auth_service.register_user(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        db_session=db,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # ── Send verification email ───────────────────────────────────────────────
    email_adapter = get_email_adapter()
    if email_adapter and email_adapter.enabled:
        # Use FRONTEND_URL env var so it works in production too
        import os
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        verification_url = f"{frontend_url}/verify-email?token={user.verification_token}"
        background_tasks.add_task(
            email_adapter.send_verification_email,
            to_email=user.email,
            full_name=user.full_name,
            verification_url=verification_url,
        )

    return {
        "message": (
            f"Account created! A verification email has been sent to {user.email}. "
            "Please check your inbox (and spam folder) and click the link to activate your account."
        ),
        "email":                user.email,
        "requires_verification": True,
    }


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db      = Depends(get_db_session),
):
    """
    Login with email/password.

    Returns 403 (not 401) when the account exists but email is unverified,
    so the frontend can show the right message and offer to resend the link.
    """
    user = await auth_service.authenticate_user(
        email=request.email,
        password=request.password,
        db_session=db,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # ── Block unverified accounts ─────────────────────────────────────────────
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",          # frontend checks this exact string
        )

    access_token = auth_service.create_access_token(
        user_id=user.id,
        email=user.email,
    )

    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user": {
            "id":             user.id,
            "email":          user.email,
            "full_name":      user.full_name,
            "email_verified": user.email_verified,
        },
    }


# ── EMAIL VERIFICATION ────────────────────────────────────────────────────────

@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    request: VerifyEmailRequest,
    db      = Depends(get_db_session),
):
    success = await auth_service.verify_email(
        token=request.token,
        db_session=db,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )
    return {"message": "Email verified successfully. You can now sign in."}


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    request:          RequestPasswordResetRequest,
    background_tasks: BackgroundTasks,
    db               = Depends(get_db_session),
):
    token = await auth_service.resend_verification_email(
        email=request.email,
        db_session=db,
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not found or already verified",
        )

    email_adapter = get_email_adapter()
    if email_adapter and email_adapter.enabled:
        import os
        frontend_url     = os.getenv("FRONTEND_URL", "http://localhost:3000")
        verification_url = f"{frontend_url}/verify-email?token={token}"
        user = db.query(User).filter(User.email == request.email).first()
        background_tasks.add_task(
            email_adapter.send_verification_email,
            to_email=user.email,
            full_name=user.full_name,
            verification_url=verification_url,
        )

    return {"message": "Verification email sent. Please check your inbox."}


# ── PASSWORD RESET ────────────────────────────────────────────────────────────

@router.post("/request-password-reset", response_model=MessageResponse)
async def request_password_reset(
    request:          RequestPasswordResetRequest,
    background_tasks: BackgroundTasks,
    db               = Depends(get_db_session),
):
    token = await auth_service.request_password_reset(
        email=request.email,
        db_session=db,
    )

    if token:
        email_adapter = get_email_adapter()
        if email_adapter and email_adapter.enabled:
            import os
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            reset_url    = f"{frontend_url}/reset-password?token={token}"
            user = db.query(User).filter(User.email == request.email).first()
            background_tasks.add_task(
                email_adapter.send_password_reset_email,
                to_email=user.email,
                full_name=user.full_name,
                reset_url=reset_url,
            )

    # Always return success (don't reveal whether email exists)
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db      = Depends(get_db_session),
):
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    success = await auth_service.reset_password(
        token=request.token,
        new_password=request.new_password,
        db_session=db,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    return {"message": "Password reset successfully"}


# ── GOOGLE OAUTH ──────────────────────────────────────────────────────────────

@router.post("/google", response_model=AuthResponse)
async def google_sign_in(
    request: GoogleSignInRequest,
    db      = Depends(get_db_session),
):
    """
    Sign in / register with Google.
    Google-authenticated users are always considered verified.
    """
    google_user = auth_service.verify_google_token(request.id_token)

    if not google_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    user = await auth_service.authenticate_google_user(
        google_id=google_user["google_id"],
        email=google_user["email"],
        full_name=google_user["full_name"],
        db_session=db,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user",
        )

    access_token = auth_service.create_access_token(
        user_id=user.id,
        email=user.email,
    )

    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user": {
            "id":             user.id,
            "email":          user.email,
            "full_name":      user.full_name,
            "email_verified": user.email_verified,
            "picture":        google_user.get("picture"),
        },
    }


# ── CURRENT USER ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db          = Depends(get_db_session),
):
    token = credentials.credentials
    user  = auth_service.get_current_user(token, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return {
        "id":             user.id,
        "email":          user.email,
        "full_name":      user.full_name,
        "email_verified": user.email_verified,
        "created_at":     user.created_at.isoformat(),
    }


@router.post("/refresh")
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db          = Depends(get_db_session),
):
    token = credentials.credentials
    user  = auth_service.get_current_user(token, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    new_token = auth_service.create_access_token(
        user_id=user.id,
        email=user.email,
    )
    return {"access_token": new_token, "token_type": "bearer"}