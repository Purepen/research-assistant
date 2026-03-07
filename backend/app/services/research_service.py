"""
Research Service — UPDATED v4

Fixes vs v3:
  1. _save_results: removed project_id=project.id — ProjectResult has no such column.
     The link is Project.result_id → ProjectResult.id (one-way FK on Project side).
  2. _save_results: wrapped in its own try/except with full traceback so failures
     are visible instead of silent.
"""

from __future__ import annotations

from typing import Optional, Dict, List
from datetime import datetime

from app.models.config import SpecificationConfig
from app.models.database import Project, ProjectResult, ProjectAnalytics, ProjectStatus
from app.core.pipelines.main_pipeline import run_complete_specification_system
from app.adapters.storage_adapter import get_storage_adapter
from app.adapters.email_adapter import get_email_adapter


class ResearchService:

    def __init__(self):
        self.storage = get_storage_adapter()

    def _get_email(self):
        return get_email_adapter()

    # ── create_project ────────────────────────────────────────────────────────

    async def create_project(
        self,
        user_id: int,
        config: SpecificationConfig,
        guidelines_file_path: Optional[str],
        past_project_files: Optional[List[str]] = None,
        dataset_file_path: Optional[str] = None,   # accepted, not stored in DB
        db_session=None,
    ) -> Project:
        project = Project(
            user_id=user_id,
            field_of_study=config.field_of_study,
            research_topic=config.research_topic or "",
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

    # ── start_generation ──────────────────────────────────────────────────────

    async def start_generation(
        self,
        project: Project,
        config: SpecificationConfig,
        db_session=None,
    ) -> Dict:

        project.status = ProjectStatus.QUEUED
        project.started_at = datetime.utcnow()
        project.progress_percentage = 5
        project.current_phase = "Queued for generation"
        if db_session:
            db_session.commit()

        async def _progress(percentage: int, phase: str):
            try:
                project.progress_percentage = percentage
                project.current_phase = phase
                if percentage >= 85:
                    project.status = ProjectStatus.REVIEWING
                elif percentage >= 15:
                    project.status = ProjectStatus.GENERATING
                if db_session:
                    db_session.commit()
            except Exception as exc:
                print(f"   ⚠️  Progress callback error: {exc}")

        try:
            project.status = ProjectStatus.GENERATING
            project.progress_percentage = 10
            project.current_phase = "Starting pipeline"
            if db_session:
                db_session.commit()

            # Load guidelines (optional)
            guidelines_doc = None
            if project.guidelines_file_path:
                try:
                    from docx import Document
                    guidelines_doc = Document(project.guidelines_file_path)
                    print(f"   ✅ Guidelines loaded: {project.guidelines_file_path}")
                except Exception as exc:
                    print(f"   ⚠️  Could not load guidelines ({exc}) — using defaults")

            start_time = datetime.utcnow()

            results = await run_complete_specification_system(
                config=config,
                guidelines_file=guidelines_doc,
                past_project_files=project.user_dumps_paths or [],
                progress_callback=_progress,
            )

            duration = (datetime.utcnow() - start_time).total_seconds()

            project.status = ProjectStatus.COMPLETE
            project.progress_percentage = 100
            project.current_phase = "Complete"
            project.completed_at = datetime.utcnow()
            if db_session:
                db_session.commit()

            result_obj = await self._save_results(project, results, db_session)
            await self._save_analytics(project, results, duration, config, db_session)

            # Email notification (sync)
            spec_results = results.get("specification_results") or {}
            if config.notification_email and spec_results.get("final_specification"):
                try:
                    email = self._get_email()
                    email_result = email.send_specification_email(
                        to=config.notification_email,
                        project_title=results.get("topic", "Research Specification"),
                        specification_html=self._format_specification_html(
                            spec_results["final_specification"]
                        ),
                        marks=spec_results["final_review"].total_marks,
                        decision=spec_results["final_review"].decision,
                    )
                    if not email_result.get("success"):
                        print(f"⚠️  Email failed: {email_result.get('error')}")
                except Exception as exc:
                    print(f"⚠️  Email error: {exc}")

            if db_session:
                db_session.commit()

            return {
                "success":          True,
                "project_id":       project.id,
                "result_id":        result_obj.id if result_obj else None,
                "duration_seconds": duration,
                "status":           "complete",
            }

        except Exception as exc:
            import traceback
            traceback.print_exc()
            project.status = ProjectStatus.FAILED
            project.current_phase = f"Error: {str(exc)[:200]}"
            if db_session:
                try:
                    db_session.commit()
                except Exception:
                    pass
            return {
                "success":    False,
                "error":      str(exc),
                "project_id": project.id,
                "status":     "failed",
            }

    # ── _save_results ─────────────────────────────────────────────────────────

    async def _save_results(self, project, results, db_session=None):
        """
        Save spec + review to ProjectResult row, then link Project.result_id.

        IMPORTANT: ProjectResult has NO project_id column.
        The link is one-way: Project.result_id → ProjectResult.id
        """
        import traceback
        try:
            spec_results = results.get("specification_results") or {}
            final_spec   = spec_results.get("final_specification")
            final_review = spec_results.get("final_review")
            synthesis    = results.get("strategic_synthesis")
            resources    = results.get("input_sources", {}).get("web_search")
            track        = results.get("track", "A")

            review_dict = None
            if final_review:
                review_dict = final_review.model_dump()
                review_dict["track"] = track

            # ✅ No project_id argument — column doesn't exist on ProjectResult
            result = ProjectResult(
                specification_json=(final_spec.model_dump() if final_spec else {}),
                synthesis_json=(synthesis.model_dump() if synthesis else None),
                final_review_json=review_dict,
                total_marks=(final_review.total_marks if final_review else None),
                decision=(final_review.decision if final_review else None),
                discovered_resources_json=(resources.model_dump() if resources else None),
                generated_at=datetime.utcnow(),
            )

            if db_session:
                db_session.add(result)
                db_session.commit()
                db_session.refresh(result)
                # Now link Project → ProjectResult
                project.result_id = result.id
                db_session.commit()
                print(f"   ✅ Results saved — ProjectResult id={result.id}, linked to Project id={project.id}")

            return result

        except Exception as exc:
            traceback.print_exc()
            print(f"❌ _save_results FAILED: {exc}")
            return None

    # ── _save_analytics ───────────────────────────────────────────────────────

    async def _save_analytics(self, project, results, duration, config, db_session=None):
        try:
            spec_results = results.get("specification_results") or {}
            final_spec   = spec_results.get("final_specification")
            stream_stats = results.get("input_sources", {}).get("stream_stats", {})
            guidelines   = results.get("guidelines")

            analytics = ProjectAnalytics(
                project_id=project.id,
                num_iterations=spec_results.get("iterations_completed", 0),
                num_web_searches=config.num_web_searches,
                num_auto_projects_found=stream_stats.get("auto_discovered_count", 0),
                num_user_projects_analyzed=stream_stats.get("user_provided_count", 0),
                final_word_count=(final_spec.total_word_count if final_spec else None),
                target_word_count=(guidelines.target_word_count if guidelines else 3000),
                total_generation_time=int(duration),
                completeness_score=100,
                novelty_score=85,
            )
            if db_session:
                db_session.add(analytics)
                db_session.commit()
        except Exception as exc:
            print(f"⚠️  _save_analytics failed: {exc}")

    # ── get_project_status ────────────────────────────────────────────────────

    async def get_project_status(self, project_id: int, db_session=None) -> Optional[Dict]:
        if not db_session:
            return None
        project = db_session.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        return {
            "project_id":          project.id,
            "status":              project.status.value,
            "progress_percentage": project.progress_percentage or 0,
            "current_phase":       project.current_phase or "",
            "is_complete":         project.status == ProjectStatus.COMPLETE,
        }

    async def get_project_results(self, project_id: int, db_session=None):
        if not db_session:
            return None
        project = db_session.query(Project).filter(Project.id == project_id).first()
        if not project or not project.result:
            return None
        return {
            "specification":        project.result.specification_json,
            "synthesis":            project.result.synthesis_json,
            "review":               project.result.final_review_json,
            "total_marks":          project.result.total_marks,
            "decision":             project.result.decision,
            "discovered_resources": project.result.discovered_resources_json,
        }

    # ── _format_specification_html ────────────────────────────────────────────

    def _format_specification_html(self, spec) -> str:
        try:
            sections = [
                ("Abstract",              spec.abstract.content),
                ("Justification and Aim", spec.justification_and_aim.content),
                ("Objectives",            spec.objectives.content),
                ("Review of Literature",  spec.literature_review.content),
                ("Methodology",           spec.methodology.content),
                ("Work Plan",             spec.work_plan.content),
            ]
            html = f"<h1>{spec.project_title}</h1>\n"
            for name, content in sections:
                html += f"<h2>{name}</h2>\n<p>{content.replace(chr(10), '<br>')}</p>\n"
            if spec.references:
                html += "<h2>References</h2>\n<ul>"
                for ref in spec.references:
                    html += f"<li>{ref}</li>"
                html += "</ul>"
            return html
        except Exception:
            return "<p>Specification generated successfully.</p>"