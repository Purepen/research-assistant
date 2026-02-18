"""
Projects Routes — FIXED

Added:
  GET /projects/{id}/download   — generates and streams a .docx specification file
  
Other fixes:
  - has_results added to ProjectDetail response
  - current_phase exposed in detail response
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import io

from app.models.database import Project
from app.api.dependencies import get_db_session, get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])
security = HTTPBearer()


# ── Response Models ───────────────────────────────────────────────────────────

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


# ── List Projects ─────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ProjectListItem])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    query = db.query(Project).filter(Project.user_id == user.id)

    if status:
        from app.models.database import ProjectStatus
        try:
            status_enum = ProjectStatus[status.upper()]
            query = query.filter(Project.status == status_enum)
        except KeyError:
            pass

    projects = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": p.id,
            "field_of_study": p.field_of_study,
            "research_topic": p.research_topic,
            "academic_level": p.academic_level,
            "status": p.status.value,
            "progress_percentage": p.progress_percentage or 0,
            "created_at": p.created_at.isoformat(),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "total_marks": p.result.total_marks if p.result else None,
            "decision": p.result.decision if p.result else None,
        }
        for p in projects
    ]


# ── Get Single Project ────────────────────────────────────────────────────────

@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == user.id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return {
        "id": project.id,
        "field_of_study": project.field_of_study,
        "research_topic": project.research_topic,
        "academic_level": project.academic_level,
        "effort_level": project.effort_level,
        "past_projects_mode": project.past_projects_mode,
        "status": project.status.value,
        "progress_percentage": project.progress_percentage or 0,
        "current_phase": project.current_phase,
        "created_at": project.created_at.isoformat(),
        "started_at": project.started_at.isoformat() if project.started_at else None,
        "completed_at": project.completed_at.isoformat() if project.completed_at else None,
        "has_results": project.result is not None,
        "total_marks": project.result.total_marks if project.result else None,
        "decision": project.result.decision if project.result else None,
    }


# ── Delete Project ────────────────────────────────────────────────────────────

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == user.id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"success": True, "message": "Project deleted"}


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/{project_id}/analytics")
async def get_project_analytics(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    from app.models.database import ProjectAnalytics

    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == user.id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    analytics = db.query(ProjectAnalytics).filter(
        ProjectAnalytics.project_id == project_id
    ).first()

    if not analytics:
        return {"message": "Analytics not available yet"}

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
        "novelty_score": analytics.novelty_score,
    }


# ── Download as DOCX ──────────────────────────────────────────────────────────

@router.get("/{project_id}/download")
async def download_project(
    project_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db_session),
):
    """
    Generate and stream a formatted .docx specification file.
    Uses python-docx to build the document from stored specification_json.
    """
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == user.id
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not project.result or not project.result.specification_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specification not ready yet",
        )

    spec = project.result.specification_json
    review = project.result.final_review_json or {}

    try:
        docx_bytes = _build_docx(spec, review, project)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DOCX generation failed: {e}")

    safe_title = "".join(
        c for c in (project.research_topic or project.field_of_study)
        if c.isalnum() or c in " _-"
    ).strip()[:60]
    filename = f"{safe_title}.docx"

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── DOCX Builder ──────────────────────────────────────────────────────────────

def _build_docx(spec: dict, review: dict, project) -> bytes:
    """Build a formatted .docx from specification_json using python-docx."""
    from docx import Document as DocxDocument
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    import re

    doc = DocxDocument()

    # ── Page margins ─────────────────────────────────────────────────────────
    for section in doc.sections:
        section.top_margin    = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin   = Inches(1.25)
        section.right_margin  = Inches(1.25)

    # ── Helper: add a heading ─────────────────────────────────────────────────
    def add_heading(text: str, level: int = 1):
        para = doc.add_heading(text, level=level)
        para.runs[0].font.color.rgb = RGBColor(0x66, 0x7e, 0xea)
        return para

    # ── Helper: add body paragraph ────────────────────────────────────────────
    def add_body(text: str):
        if not text:
            return
        # Split on double newlines for paragraph breaks
        for block in re.split(r'\n{2,}', text.strip()):
            p = doc.add_paragraph(block.strip())
            p.paragraph_format.space_after = Pt(6)

    # ── Title Page ────────────────────────────────────────────────────────────
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title_para.add_run(spec.get("project_title", "Research Specification"))
    run.font.size = Pt(20)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x66, 0x7e, 0xea)

    doc.add_paragraph()  # spacer

    meta_para = doc.add_paragraph()
    meta_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_lines = [
        f"Level: {project.academic_level}",
        f"Field: {project.field_of_study}",
        f"Generated: {project.completed_at.strftime('%d %B %Y') if project.completed_at else ''}",
    ]
    if review.get("total_marks"):
        meta_lines.append(f"Score: {review['total_marks']}/100 — {review.get('decision', '')}")
    meta_para.add_run("\n".join(meta_lines)).font.size = Pt(11)

    doc.add_page_break()

    # ── Sections ──────────────────────────────────────────────────────────────
    sections_map = [
        ("Abstract",                   "abstract"),
        ("Justification and Overall Aim", "justification_and_aim"),
        ("Objectives",                 "objectives"),
        ("Review of Literature",       "literature_review"),
        ("Methodology",                "methodology"),
        ("Work Plan",                  "work_plan"),
    ]

    for label, key in sections_map:
        section_data = spec.get(key, {})
        if not section_data:
            continue
        content    = section_data.get("content", "")
        word_count = section_data.get("word_count", 0)

        add_heading(label, level=1)

        # Word count subtitle
        wc_para = doc.add_paragraph(f"({word_count} words)")
        wc_para.runs[0].font.size = Pt(9)
        wc_para.runs[0].font.color.rgb = RGBColor(0x9C, 0xA3, 0xAF)
        wc_para.paragraph_format.space_after = Pt(4)

        add_body(content)
        doc.add_paragraph()  # spacer

    # ── References ────────────────────────────────────────────────────────────
    references = spec.get("references", [])
    if references:
        add_heading("References", level=1)
        for i, ref in enumerate(references, 1):
            p = doc.add_paragraph(style="List Number")
            p.add_run(ref)

    # ── Review Summary (appendix) ─────────────────────────────────────────────
    if review:
        doc.add_page_break()
        add_heading("Professor Review Summary", level=1)

        if review.get("total_marks"):
            score_para = doc.add_paragraph()
            score_run = score_para.add_run(f"Score: {review['total_marks']}/100 — {review.get('decision', '')}")
            score_run.font.bold = True
            score_run.font.size = Pt(13)

        for field, label in [
            ("overall_strengths",       "Overall Strengths"),
            ("critical_issues",         "Critical Issues"),
            ("improvement_priorities",  "Improvement Priorities"),
        ]:
            items = review.get(field, [])
            if items:
                add_heading(label, level=2)
                for item in items:
                    p = doc.add_paragraph(item, style="List Bullet")

    # ── Serialise to bytes ────────────────────────────────────────────────────
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()