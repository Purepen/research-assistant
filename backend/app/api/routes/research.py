"""
Research Routes — UPDATED v3

Changes vs v2:
  - /result/{project_id}: now returns "critic" field containing critic_json
    from the ProjectResult row. Nullable — old results return null.

All other endpoints (/generate, /status, /cancel) are verbatim from v2.

BUG FIX (carried over from v2):
  - result.review_json     → result.final_review_json  (correct column name)
  - result.word_count      → computed from specification_json (column doesn't exist)
"""

from __future__ import annotations

from fastapi import (
    APIRouter, BackgroundTasks, Depends, HTTPException,
    status, UploadFile, File, Form,
)
from pydantic import BaseModel
from typing import List, Optional
import json

from app.services.research_service import ResearchService
from app.services.auth_service import AuthService
from app.services.storage_service import StorageService
from app.models.config import SpecificationConfig
from app.models.database import Project, ProjectStatus
from app.api.dependencies import get_db_session, get_current_user, SessionLocal

router = APIRouter(prefix="/research", tags=["Research"])

research_service = ResearchService()
auth_service     = AuthService()
storage_service  = StorageService()


# ─── Response models ──────────────────────────────────────────────────────────

class GenerateResponse(BaseModel):
    success:    bool
    project_id: int
    message:    str
    status:     str


class StatusResponse(BaseModel):
    project_id:          int
    status:              str
    progress_percentage: int
    current_phase:       str
    is_complete:         bool


# ─── Background task ──────────────────────────────────────────────────────────

async def _run_generation_background(project_id: int, config: SpecificationConfig, dataset_file_path: str = None):
    """
    Runs the full generation pipeline in the background.
    Opens its own DB session — the request session is already closed.
    """
    db = SessionLocal()
    project = None
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            print(f"❌ Background task: project {project_id} not found")
            return

        print(f"\n🚀 Background generation started for project {project_id}")
        print(f"   Field: {config.field_of_study} | Topic: {config.research_topic}")
        print(f"   Dataset: {config.dataset_name or config.dataset_source}")

        await research_service.start_generation(
            project=project,
            config=config,
            db_session=db,
            dataset_file_path=dataset_file_path,
        )
        print(f"✅ Background generation complete for project {project_id}")

    except Exception as exc:
        print(f"❌ Background generation FAILED for project {project_id}: {exc}")
        import traceback
        traceback.print_exc()
        if project:
            try:
                project.status = ProjectStatus.FAILED
                project.current_phase = f"Error: {str(exc)[:200]}"
                db.commit()
            except Exception:
                pass
    finally:
        db.close()


# ─── /generate ────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_specification(
    background_tasks: BackgroundTasks,
    config_json: str = Form(...),
    guidelines_file: Optional[UploadFile] = File(None),
    past_project_files: Optional[List[UploadFile]] = File(None),
    dataset_file: Optional[UploadFile] = File(None),
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """
    Generate research specification.

    Steps:
      1. Parse + validate config
      2. Upload files to storage (guidelines optional, dataset optional)
      3. Create Project row (status=QUEUED)
      4. Schedule background generation task
      5. Return project_id immediately so client can poll
    """

    # ── 1. Parse config ───────────────────────────────────────────────────────
    try:
        config_dict = json.loads(config_json)
        config = SpecificationConfig(**config_dict)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid configuration: {exc}",
        )

    # Normalise list fields
    if past_project_files and not isinstance(past_project_files, list):
        past_project_files = [past_project_files]

    # ── 2. Upload guidelines (optional) ───────────────────────────────────────
    guidelines_path: Optional[str] = None
    if guidelines_file and guidelines_file.filename:
        result = await storage_service.upload_guidelines(
            user_id=user.id,
            file_data=guidelines_file.file,
            filename=guidelines_file.filename,
            file_size=guidelines_file.size,
        )
        if result["success"]:
            guidelines_path = result["path"]

    # ── 3. Upload dataset (optional) ──────────────────────────────────────────
    dataset_file_path: Optional[str] = None
    if dataset_file and dataset_file.filename:
        result = await storage_service.upload_dataset(
            user_id=user.id,
            file_data=dataset_file.file,
            filename=dataset_file.filename,
            file_size=dataset_file.size,
        )
        if result["success"]:
            dataset_file_path = result["path"]
            config.dataset_source = "uploaded"
            config.dataset_name   = dataset_file.filename

    # ── 4. Upload past project files ──────────────────────────────────────────
    past_project_paths: List[str] = []
    if past_project_files:
        for f in past_project_files:
            r = await storage_service.upload_past_project(
                user_id=user.id,
                file_data=f.file,
                filename=f.filename,
                file_size=f.size,
            )
            if r["success"]:
                past_project_paths.append(r["path"])

    # ── 5. Create project in DB ───────────────────────────────────────────────
    project = await research_service.create_project(
        user_id=user.id,
        config=config,
        guidelines_file_path=guidelines_path,
        dataset_file_path=dataset_file_path,
        past_project_files=past_project_paths,
        db_session=db,
    )

    project.status = ProjectStatus.QUEUED
    project.current_phase = "Queued for generation"
    project.progress_percentage = 5
    db.commit()

    # ── 6. Launch background task ─────────────────────────────────────────────
    background_tasks.add_task(_run_generation_background, project.id, config, dataset_file_path)
    print(f"📋 Project {project.id} queued")

    return GenerateResponse(
        success=True,
        project_id=project.id,
        message="Generation started",
        status="queued",
    )


# ─── /status/{project_id} ────────────────────────────────────────────────────

@router.get("/status/{project_id}", response_model=StatusResponse)
async def get_generation_status(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """Poll generation status."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id,
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return StatusResponse(
        project_id=project.id,
        status=project.status.value,
        progress_percentage=project.progress_percentage or 0,
        current_phase=project.current_phase or "Processing",
        is_complete=project.status == ProjectStatus.COMPLETE,
    )


# ─── /result/{project_id} ────────────────────────────────────────────────────

@router.get("/result/{project_id}")
async def get_generation_result(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """
    Get final specification result.

    Returns specification, review, AND critic analysis.
    critic is null for projects generated before the critic agent was added.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id,
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status != ProjectStatus.COMPLETE:
        raise HTTPException(
            status_code=400,
            detail=f"Project not complete. Status: {project.status.value}"
        )

    # ProjectResult has no project_id column.
    # Relationship is: Project.result_id → ProjectResult.id
    if not project.result_id:
        raise HTTPException(status_code=404, detail="Result not found — generation may still be saving")

    ProjectResult = __import__("app.models.database", fromlist=["ProjectResult"]).ProjectResult
    result = db.query(ProjectResult).filter(ProjectResult.id == project.result_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Result record missing from database")

    spec_json  = result.specification_json or {}
    word_count = spec_json.get("total_word_count", 0)

    return {
        "success":       True,
        "project_id":    project_id,
        "specification": result.specification_json,
        "review":        result.final_review_json,
        "critic":        result.critic_json,          # NEW — null for old results
        "word_count":    word_count,
        "marks":         result.total_marks,
        "decision":      result.decision,
        "track":         getattr(result, "track", "A"),
    }


# ─── /cancel/{project_id} ────────────────────────────────────────────────────

@router.post("/cancel/{project_id}")
async def cancel_generation(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id,
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status in (ProjectStatus.COMPLETE, ProjectStatus.FAILED):
        raise HTTPException(status_code=400, detail="Cannot cancel a finished project")

    project.status = ProjectStatus.FAILED
    project.current_phase = "Cancelled by user"
    db.commit()

    return {"success": True, "message": "Generation cancelled"}