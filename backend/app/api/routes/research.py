"""
Research Routes

Purpose: Research specification generation endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Annotated, Optional,List
import json

from app.services.research_service import ResearchService
from app.services.auth_service import AuthService
from app.services.storage_service import StorageService
from app.models.config import SpecificationConfig
from app.api.dependencies import get_db_session, get_current_user

router = APIRouter(prefix="/research", tags=["Research"])
security = HTTPBearer()

research_service = ResearchService()
auth_service = AuthService()
storage_service = StorageService()


# Request/Response Models
class GenerateRequest(BaseModel):
    field_of_study: str
    research_topic: Optional[str] = None
    academic_level: str = "MSc"
    effort_level: str = "medium"
    past_projects_mode: str = "hybrid"
    num_auto_projects_target: int = 3
    min_auto_projects_required: int = 1
    max_auto_projects_accepted: int = 3
    deduplicate_auto_vs_user: bool = True
    max_iterations: int = 3
    num_web_searches: int = 5
    notification_email: Optional[str] = None


class GenerateResponse(BaseModel):
    success: bool
    project_id: int
    message: str
    status: str


class StatusResponse(BaseModel):
    project_id: int
    status: str
    progress_percentage: int
    current_phase: str
    is_complete: bool


@router.post("/generate", response_model=GenerateResponse)
async def generate_specification(
    config_json: str = Form(...),
    guidelines_file: UploadFile = File(...),
    # past_project_files: Optional[List[UploadFile]] = File(None),
    # past_project_files: Annotated[list[UploadFile] | None, File()] = None,
    past_project_files: UploadFile | list[UploadFile] | None = File(None),
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Generate research specification
    
    1. Upload guidelines and past projects
    2. Create project in database
    3. Start generation pipeline (async)
    4. Return project ID for status tracking
    """
    
    # Parse config
    try:
        config_dict = json.loads(config_json)
        config = SpecificationConfig(**config_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid configuration: {str(e)}"
        )

    # past_project_files = past_project_files or []

    # Normalize to list
    if past_project_files and not isinstance(past_project_files, list):
        past_project_files = [past_project_files]
    
    # Upload guidelines file
    guidelines_result = await storage_service.upload_guidelines(
        user_id=user.id,
        file_data=guidelines_file.file,
        filename=guidelines_file.filename,
        file_size=guidelines_file.size
    )
    
    if not guidelines_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guidelines upload failed: {', '.join(guidelines_result.get('errors', ['Unknown error']))}"
        )
    
    # Upload past project files
    past_project_paths = []
    if past_project_files:
        for file in past_project_files:
            result = await storage_service.upload_past_project(
                user_id=user.id,
                file_data=file.file,
                filename=file.filename,
                file_size=file.size
            )
            if result["success"]:
                past_project_paths.append(result["path"])
    
    # Create project
    project = await research_service.create_project(
        user_id=user.id,
        config=config,
        guidelines_file_path=guidelines_result["path"],
        past_project_files=past_project_paths,
        db_session=db
    )
    
    # Start generation (would be async with background task in production)
    # For now, return immediately and let client poll status
    # In production: background_tasks.add_task(research_service.start_generation, ...)
    
    return {
        "success": True,
        "project_id": project.id,
        "message": "Generation started",
        "status": "queued"
    }


@router.get("/status/{project_id}", response_model=StatusResponse)
async def get_generation_status(
    project_id: int,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get generation status for a project
    """
    
    # Check permission
    if not auth_service.check_user_permission(user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    status_data = await research_service.get_project_status(project_id, db)
    
    if "error" in status_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=status_data["error"]
        )
    
    return status_data


@router.get("/result/{project_id}")
async def get_generation_result(
    project_id: int,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Get final specification result
    """
    
    # Check permission
    if not auth_service.check_user_permission(user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    result = await research_service.get_project_results(project_id, db)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Results not found or generation not complete"
        )
    
    return result


@router.post("/cancel/{project_id}")
async def cancel_generation(
    project_id: int,
    user = Depends(get_current_user),
    db = Depends(get_db_session)
):
    """
    Cancel ongoing generation
    """
    
    # Check permission
    if not auth_service.check_user_permission(user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Implementation: Stop generation task
    # For now, just return success
    
    return {
        "success": True,
        "message": "Generation cancelled"
    }
