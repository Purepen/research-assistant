"""
User Routes

Purpose: User profile and settings endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional

from app.models.database import User, Project
from app.api.dependencies import get_db_session, get_current_user

router = APIRouter(prefix="/user", tags=["User"])
security = HTTPBearer()


# Response Models
class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: str
    last_login: str
    total_projects: int
    completed_projects: int


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None


@router.get("/profile", response_model=UserProfile)
async def get_user_profile(
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get current user's profile
    """
    
    # Count projects
    from app.core.domain.project import ProjectStatus
    
    total_projects = db.query(Project).filter(Project.user_id == user.id).count()
    
    completed_projects = db.query(Project).filter(
        Project.user_id == user.id,
        Project.status == ProjectStatus.COMPLETE
    ).count()
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at.isoformat(),
        "last_login": user.last_login.isoformat(),
        "total_projects": total_projects,
        "completed_projects": completed_projects
    }


@router.patch("/profile")
async def update_user_profile(
    request: UpdateProfileRequest,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Update user profile
    """
    
    if request.full_name:
        user.full_name = request.full_name
    
    db.commit()
    
    return {
        "success": True,
        "message": "Profile updated"
    }


@router.get("/stats")
async def get_user_stats(
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get user statistics
    """
    
    from app.core.domain.project import ProjectStatus
    from sqlalchemy import func
    from app.models.database import ProjectAnalytics
    
    # Project counts by status
    projects = db.query(Project).filter(Project.user_id == user.id).all()
    
    status_counts = {}
    for status in ProjectStatus:
        count = sum(1 for p in projects if p.status == status)
        if count > 0:
            status_counts[status.value] = count
    
    # Average marks
    completed_projects = [p for p in projects if p.result]
    avg_marks = sum(p.result.total_marks for p in completed_projects) / len(completed_projects) if completed_projects else 0
    
    # Total generation time
    analytics = db.query(ProjectAnalytics).join(Project).filter(Project.user_id == user.id).all()
    total_time = sum(a.total_generation_time or 0 for a in analytics)
    
    return {
        "total_projects": len(projects),
        "status_breakdown": status_counts,
        "completed_projects": len(completed_projects),
        "average_marks": round(avg_marks, 1),
        "total_generation_time_seconds": total_time,
        "total_generation_time_hours": round(total_time / 3600, 1)
    }


@router.delete("/account")
async def delete_account(
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Delete user account and all associated data
    """
    
    # Delete user (cascade will delete projects)
    db.delete(user)
    db.commit()
    
    return {
        "success": True,
        "message": "Account deleted"
    }
