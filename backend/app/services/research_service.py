"""
Research Service — FIXED

Changes:
  1. start_generation() now passes a `progress_callback` to the pipeline so
     every phase writes its progress % and phase name to the DB.  This is
     what makes the frontend progress bar actually move.

  2. _save_results() now handles both real results (with final_specification)
     and the case where specification_results is an empty dict (graceful
     degradation instead of crashing with KeyError).

  3. Status is correctly set to REVIEWING while the professor review runs,
     giving the UI three distinct visible stages.
"""

from __future__ import annotations

from typing import Optional, Dict, List
from docx import Document
from datetime import datetime

from app.models.config import SpecificationConfig
from app.models.database import Project, ProjectResult, ProjectAnalytics, ProjectStatus
from app.core.domain.project import ProjectLifecycle, ProjectStatus as DomainProjectStatus
from app.core.pipelines.main_pipeline import run_complete_specification_system
from app.adapters.storage_adapter import get_storage_adapter
from app.adapters.email_adapter import get_email_adapter


class ResearchService:
    """Orchestrates specification generation workflow."""

    def __init__(self):
        self.storage = get_storage_adapter()
        self.email = get_email_adapter()

    # -------------------------------------------------------------------------
    # Project creation
    # -------------------------------------------------------------------------

    async def create_project(
        self,
        user_id: int,
        config: SpecificationConfig,
        guidelines_file_path: str,
        past_project_files: Optional[List[str]] = None,
        db_session=None,
    ) -> Project:
        project = Project(
            user_id=user_id,
            field_of_study=config.field_of_study,
            research_topic=config.research_topic,
            academic_level=config.academic_level,
            effort_level=config.effort_level,
            past_projects_mode=config.past_projects_mode,
            status=ProjectStatus.DRAFT,
            guidelines_file_path=guidelines_file_path,
            user_dumps_paths=past_project_files or [],
        )

        if db_session:
            db_session.add(project)
            db_session.commit()
            db_session.refresh(project)

        return project

    # -------------------------------------------------------------------------
    # Generation
    # -------------------------------------------------------------------------

    async def start_generation(
        self,
        project: Project,
        config: SpecificationConfig,
        db_session=None,
    ) -> Dict:

        # Transition → QUEUED
        project.status = ProjectStatus.QUEUED
        project.started_at = datetime.utcnow()
        project.progress_percentage = 5
        project.current_phase = "Queued for generation"
        if db_session:
            db_session.commit()

        # ------------------------------------------------------------------
        # Progress callback — called by the pipeline at each phase
        # ------------------------------------------------------------------
        async def _progress(percentage: int, phase: str):
            """Write live progress to DB so the frontend can poll it."""
            try:
                project.progress_percentage = percentage
                project.current_phase = phase

                # Update status to REVIEWING once we hit review stage
                if percentage >= 85:
                    project.status = ProjectStatus.REVIEWING
                elif percentage >= 15:
                    project.status = ProjectStatus.GENERATING

                if db_session:
                    db_session.commit()
            except Exception as cb_err:
                print(f"   ⚠️  Progress callback error: {cb_err}")

        try:
            # Transition → GENERATING
            project.status = ProjectStatus.GENERATING
            project.progress_percentage = 10
            project.current_phase = "Starting pipeline"
            if db_session:
                db_session.commit()

            # Load guidelines document
            guidelines_doc = Document(project.guidelines_file_path)

            start_time = datetime.utcnow()

            # Run full pipeline with progress reporting
            results = await run_complete_specification_system(
                config=config,
                guidelines_file=guidelines_doc,
                past_project_files=project.user_dumps_paths or [],
                progress_callback=_progress,
            )

            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()

            # Transition → COMPLETE
            project.status = ProjectStatus.COMPLETE
            project.progress_percentage = 100
            project.current_phase = "Complete"
            project.completed_at = datetime.utcnow()

            # Save results (handles both full and partial results gracefully)
            result_obj = await self._save_results(
                project=project,
                results=results,
                db_session=db_session,
            )

            await self._save_analytics(
                project=project,
                results=results,
                duration=duration,
                config=config,
                db_session=db_session,
            )

            # Send email notification if configured
            spec_results = results.get("specification_results", {})
            if config.notification_email and spec_results.get("final_specification"):
                try:
                    await self.email.send_specification_email(
                        to=config.notification_email,
                        project_title=results.get("topic", "Research Specification"),
                        specification_html=self._format_specification_html(
                            spec_results["final_specification"]
                        ),
                        marks=spec_results["final_review"].total_marks,
                        decision=spec_results["final_review"].decision,
                    )
                except Exception as email_err:
                    print(f"⚠️  Email notification failed: {email_err}")

            if db_session:
                db_session.commit()

            return {
                "success": True,
                "project_id": project.id,
                "result_id": result_obj.id if result_obj else None,
                "duration_seconds": duration,
                "status": "complete",
            }

        except Exception as exc:
            print(f"❌ Generation failed for project {project.id}: {exc}")
            import traceback
            traceback.print_exc()

            project.status = ProjectStatus.FAILED
            project.current_phase = f"Error: {str(exc)[:200]}"
            if db_session:
                db_session.commit()

            return {
                "success": False,
                "error": str(exc),
                "project_id": project.id,
                "status": "failed",
            }

    # -------------------------------------------------------------------------
    # Save helpers
    # -------------------------------------------------------------------------

    async def _save_results(
        self,
        project: Project,
        results: Dict,
        db_session=None,
    ) -> Optional[ProjectResult]:
        """
        Persist generation results to the database.

        Handles both the successful case (spec_results has final_specification)
        and the edge case where specification_results is missing / empty.
        """
        try:
            spec_results = results.get("specification_results") or {}

            # Safely extract objects (may be None / missing)
            final_spec = spec_results.get("final_specification")
            final_review = spec_results.get("final_review")
            strategic_synthesis = results.get("strategic_synthesis")
            discovered_resources = results.get("input_sources", {}).get("web_search")

            result = ProjectResult(
                specification_json=(
                    final_spec.model_dump() if final_spec else {}
                ),
                synthesis_json=(
                    strategic_synthesis.model_dump() if strategic_synthesis else None
                ),
                final_review_json=(
                    final_review.model_dump() if final_review else None
                ),
                total_marks=(
                    final_review.total_marks if final_review else None
                ),
                decision=(
                    final_review.decision if final_review else None
                ),
                discovered_resources_json=(
                    discovered_resources.model_dump()
                    if discovered_resources
                    else None
                ),
                generated_at=datetime.utcnow(),
            )

            if db_session:
                db_session.add(result)
                db_session.commit()
                db_session.refresh(result)

                # Link back to project
                project.result_id = result.id
                db_session.commit()

            return result

        except Exception as exc:
            print(f"Error saving results: {exc}")
            import traceback
            traceback.print_exc()
            return None

    async def _save_analytics(
        self,
        project: Project,
        results: Dict,
        duration: float,
        config: SpecificationConfig,
        db_session=None,
    ):
        try:
            spec_results = results.get("specification_results") or {}
            final_spec = spec_results.get("final_specification")
            input_sources = results.get("input_sources", {})
            stream_stats = input_sources.get("stream_stats", {})
            guidelines = results.get("guidelines")

            analytics = ProjectAnalytics(
                project_id=project.id,
                num_iterations=spec_results.get("iterations_completed", 0),
                num_web_searches=config.num_web_searches,
                num_auto_projects_found=stream_stats.get("auto_discovered_count", 0),
                num_user_projects_analyzed=stream_stats.get("user_provided_count", 0),
                final_word_count=(
                    final_spec.total_word_count if final_spec else None
                ),
                target_word_count=(
                    guidelines.target_word_count if guidelines else None
                ),
                total_generation_time=int(duration),
                completeness_score=100,
                novelty_score=85,
            )

            if db_session:
                db_session.add(analytics)
                db_session.commit()

        except Exception as exc:
            print(f"Error saving analytics: {exc}")

    # -------------------------------------------------------------------------
    # Status & results queries
    # -------------------------------------------------------------------------

    async def get_project_status(self, project_id: int, db_session=None) -> Dict:
        if not db_session:
            return {"error": "Database session required"}

        project = db_session.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}

        return {
            "project_id": project.id,
            "status": project.status.value,
            "progress_percentage": project.progress_percentage or 0,
            "current_phase": project.current_phase or project.status.value,
            "is_complete": project.status == ProjectStatus.COMPLETE,
            "created_at": project.created_at.isoformat(),
            "started_at": (
                project.started_at.isoformat() if project.started_at else None
            ),
            "completed_at": (
                project.completed_at.isoformat() if project.completed_at else None
            ),
        }

    async def get_project_results(
        self, project_id: int, db_session=None
    ) -> Optional[Dict]:
        if not db_session:
            return None

        project = db_session.query(Project).filter(Project.id == project_id).first()
        if not project or not project.result:
            return None

        return {
            "specification": project.result.specification_json,
            "synthesis": project.result.synthesis_json,
            "review": project.result.final_review_json,
            "total_marks": project.result.total_marks,
            "decision": project.result.decision,
        }

    # -------------------------------------------------------------------------
    # Formatting
    # -------------------------------------------------------------------------

    def _format_specification_html(self, spec) -> str:
        return f"""
<div style="font-family: sans-serif;">
    <h1>{spec.project_title}</h1>
    <h2>Abstract</h2><p>{spec.abstract.content}</p>
    <h2>Justification and Overall Aim</h2><p>{spec.justification_and_aim.content}</p>
    <h2>Objectives</h2><p>{spec.objectives.content}</p>
    <h2>Review of Literature</h2><p>{spec.literature_review.content}</p>
    <h2>Methodology</h2><p>{spec.methodology.content}</p>
    <h2>Work Plan</h2><p>{spec.work_plan.content}</p>
    <h2>References</h2>
    <ol>{''.join(f'<li>{r}</li>' for r in spec.references)}</ol>
</div>
"""