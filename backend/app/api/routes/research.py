"""
Research Routes — FIXED

Changes from broken version:
  1. Generation is actually triggered via FastAPI BackgroundTasks
  2. Background task creates its own DB session (original is closed after response)
  3. Project status is set to QUEUED immediately before response is sent
  4. Errors in background are caught and written as FAILED status to DB
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Annotated, Optional, List
import json
import asyncio

from app.services.research_service import ResearchService
from app.services.auth_service import AuthService
from app.services.storage_service import StorageService
from app.models.config import SpecificationConfig
from app.models.database import Project, ProjectStatus
from app.api.dependencies import get_db_session, get_current_user, SessionLocal

router = APIRouter(prefix="/research", tags=["Research"])
security = HTTPBearer()

research_service = ResearchService()
auth_service = AuthService()
storage_service = StorageService()


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Background generation task
# ---------------------------------------------------------------------------

async def _run_generation_background(project_id: int, config: SpecificationConfig):
    """
    Runs the full generation pipeline in the background.

    IMPORTANT: FastAPI closes the request-scoped DB session right after the
    response is sent.  This task must open its own session.
    """
    db = SessionLocal()
    project = None
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            print(f"❌ Background task: project {project_id} not found")
            return

        print(f"\n🚀 Background generation started for project {project_id}")
        print(f"   Field: {config.field_of_study}")
        print(f"   Topic: {config.research_topic}")
        print(f"   Level: {config.academic_level}")

        await research_service.start_generation(
            project=project,
            config=config,
            db_session=db,
        )

        print(f"✅ Background generation complete for project {project_id}")

    except Exception as exc:
        print(f"❌ Background generation FAILED for project {project_id}: {exc}")
        import traceback
        traceback.print_exc()

        # Mark the project as failed so the UI reflects reality
        if project:
            try:
                project.status = ProjectStatus.FAILED
                project.current_phase = f"Error: {str(exc)[:200]}"
                db.commit()
            except Exception as db_err:
                print(f"   Could not update failed status: {db_err}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate", response_model=GenerateResponse)
async def generate_specification(
    background_tasks: BackgroundTasks,
    config_json: str = Form(...),
    guidelines_file: UploadFile = File(...),
    past_project_files: UploadFile | list[UploadFile] | None = File(None),
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """
    Generate research specification.

    Steps:
      1. Parse + validate config
      2. Upload files to storage
      3. Create Project row (status=QUEUED)
      4. Schedule background generation task
      5. Return project_id immediately so the client can poll for status
    """

    # 1. Parse config -----------------------------------------------------------
    try:
        config_dict = json.loads(config_json)
        config = SpecificationConfig(**config_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid configuration: {str(e)}",
        )

    # Normalise past_project_files to a list
    if past_project_files and not isinstance(past_project_files, list):
        past_project_files = [past_project_files]

    # 2. Upload guidelines file -------------------------------------------------
    guidelines_result = await storage_service.upload_guidelines(
        user_id=user.id,
        file_data=guidelines_file.file,
        filename=guidelines_file.filename,
        file_size=guidelines_file.size,
    )

    if not guidelines_result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guidelines upload failed: {', '.join(guidelines_result.get('errors', ['Unknown error']))}",
        )

    # 3. Upload past project files ----------------------------------------------
    past_project_paths: List[str] = []
    if past_project_files:
        for file in past_project_files:
            result = await storage_service.upload_past_project(
                user_id=user.id,
                file_data=file.file,
                filename=file.filename,
                file_size=file.size,
            )
            if result["success"]:
                past_project_paths.append(result["path"])

    # 4. Create project in DB (starts as DRAFT, immediately queued below) ------
    project = await research_service.create_project(
        user_id=user.id,
        config=config,
        guidelines_file_path=guidelines_result["path"],
        past_project_files=past_project_paths,
        db_session=db,
    )

    # Set status to QUEUED so the UI shows something meaningful right away
    project.status = ProjectStatus.QUEUED
    project.current_phase = "Queued for generation"
    project.progress_percentage = 5
    db.commit()

    # 5. Schedule background generation ----------------------------------------
    background_tasks.add_task(_run_generation_background, project.id, config)

    print(f"📋 Project {project.id} created and queued for generation")

    return {
        "success": True,
        "project_id": project.id,
        "message": "Generation started",
        "status": "queued",
    }


@router.get("/status/{project_id}", response_model=StatusResponse)
async def get_generation_status(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """Poll generation status for a project."""

    if not auth_service.check_user_permission(user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    status_data = await research_service.get_project_status(project_id, db)

    if "error" in status_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=status_data["error"],
        )

    return status_data


@router.get("/result/{project_id}")
async def get_generation_result(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """Get the final specification result once generation is complete."""

    if not auth_service.check_user_permission(user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await research_service.get_project_results(project_id, db)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Results not found or generation not complete",
        )

    return result


@router.post("/cancel/{project_id}")
async def cancel_generation(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """Cancel ongoing generation."""

    if not auth_service.check_user_permission(user, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Find the project and mark it failed
    project = db.query(Project).filter(Project.id == project_id).first()
    if project and project.status not in (ProjectStatus.COMPLETE, ProjectStatus.FAILED):
        project.status = ProjectStatus.FAILED
        project.current_phase = "Cancelled by user"
        db.commit()

    return {"success": True, "message": "Generation cancelled"}