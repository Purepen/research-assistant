"""
Projects Routes

Purpose: Project management endpoints (list, get, delete)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.database import Project
from app.api.dependencies import get_db_session, get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])
security = HTTPBearer()


# Response Models
class ProjectListItem(BaseModel):
    id: int
    field_of_study: str
    research_topic: Optional[str]
    academic_level: str
    status: str
    progress_percentage: int
    created_at: str
    completed_at: Optional[str]
    total_marks: Optional[int]
    decision: Optional[str]


class ProjectDetail(BaseModel):
    id: int
    field_of_study: str
    research_topic: Optional[str]
    academic_level: str
    effort_level: str
    past_projects_mode: str
    status: str
    progress_percentage: int
    current_phase: Optional[str]
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    has_results: bool
    total_marks: Optional[int]
    decision: Optional[str]


@router.get("/", response_model=List[ProjectListItem])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    List user's projects with pagination and filtering
    """
    
    query = db.query(Project).filter(Project.user_id == user.id)
    
    # Filter by status if provided
    if status:
        from app.core.domain.project import ProjectStatus
        try:
            status_enum = ProjectStatus[status.upper()]
            query = query.filter(Project.status == status_enum)
        except KeyError:
            pass
    
    # Order by created date (newest first)
    query = query.order_by(Project.created_at.desc())
    
    # Pagination
    projects = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": p.id,
            "field_of_study": p.field_of_study,
            "research_topic": p.research_topic,
            "academic_level": p.academic_level,
            "status": p.status.value,
            "progress_percentage": p.progress_percentage,
            "created_at": p.created_at.isoformat(),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "total_marks": p.result.total_marks if p.result else None,
            "decision": p.result.decision if p.result else None
        }
        for p in projects
    ]


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: int,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get project details
    """
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    from app.core.domain.project import ProjectLifecycle
    lifecycle = ProjectLifecycle(project.status)
    
    return {
        "id": project.id,
        "field_of_study": project.field_of_study,
        "research_topic": project.research_topic,
        "academic_level": project.academic_level,
        "effort_level": project.effort_level,
        "past_projects_mode": project.past_projects_mode,
        "status": project.status.value,
        "progress_percentage": project.progress_percentage,
        "current_phase": lifecycle.get_phase_description(),
        "created_at": project.created_at.isoformat(),
        "started_at": project.started_at.isoformat() if project.started_at else None,
        "completed_at": project.completed_at.isoformat() if project.completed_at else None,
        "has_results": project.result is not None,
        "total_marks": project.result.total_marks if project.result else None,
        "decision": project.result.decision if project.result else None
    }


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Delete a project
    """
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    
    return {
        "success": True,
        "message": "Project deleted"
    }


@router.get("/{project_id}/analytics")
async def get_project_analytics(
    project_id: int,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get project analytics
    """
    
    from app.models.database import ProjectAnalytics
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    analytics = db.query(ProjectAnalytics).filter(
        ProjectAnalytics.project_id == project_id
    ).first()
    
    if not analytics:
        return {
            "message": "Analytics not available yet"
        }
    
    return {
        "project_id": project_id,
        "num_iterations": analytics.num_iterations,
        "num_web_searches": analytics.num_web_searches,
        "num_auto_projects_found": analytics.num_auto_projects_found,
        "num_user_projects_analyzed": analytics.num_user_projects_analyzed,
        "final_word_count": analytics.final_word_count,
        "target_word_count": analytics.target_word_count,
        "total_generation_time": analytics.total_generation_time,
        "completeness_score": analytics.completeness_score,
        "novelty_score": analytics.novelty_score
    }
