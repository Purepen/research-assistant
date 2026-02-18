"""
Research Service — FIXED (v2)

Key fixes:
  1. send_specification_email is SYNC — removed 'await' (was crashing).
  2. Email adapter re-created per-call so it reads env vars after load_dotenv().
  3. _save_results / _save_analytics handle empty spec_results gracefully.
  4. Progress callback properly handles REVIEWING phase.
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
    def __init__(self):
        self.storage = get_storage_adapter()

    # ── email adapter re-created each time to pick up env vars ──────────────
    def _get_email(self):
        return get_email_adapter()

    # -------------------------------------------------------------------------
    async def create_project(self, user_id, config, guidelines_file_path,
                             past_project_files=None, db_session=None) -> Project:
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
    async def start_generation(self, project: Project, config: SpecificationConfig,
                               db_session=None) -> Dict:
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
            except Exception as e:
                print(f"   ⚠️ Progress callback error: {e}")

        try:
            project.status = ProjectStatus.GENERATING
            project.progress_percentage = 10
            project.current_phase = "Starting pipeline"
            if db_session:
                db_session.commit()

            guidelines_doc = Document(project.guidelines_file_path)
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

            result_obj = await self._save_results(project, results, db_session)
            await self._save_analytics(project, results, duration, config, db_session)

            # ── Email (SYNC — no await) ──────────────────────────────────────
            spec_results = results.get("specification_results") or {}
            if config.notification_email and spec_results.get("final_specification"):
                try:
                    email = self._get_email()
                    # ✅ No await — send_specification_email is a plain def
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
                        print(f"⚠️ Email failed: {email_result.get('error')}")
                except Exception as e:
                    print(f"⚠️ Email notification error: {e}")

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
            import traceback; traceback.print_exc()
            project.status = ProjectStatus.FAILED
            project.current_phase = f"Error: {str(exc)[:200]}"
            if db_session:
                db_session.commit()
            return {"success": False, "error": str(exc), "project_id": project.id, "status": "failed"}

    # -------------------------------------------------------------------------
    async def _save_results(self, project, results, db_session=None):
        try:
            spec_results = results.get("specification_results") or {}
            final_spec   = spec_results.get("final_specification")
            final_review = spec_results.get("final_review")
            synthesis    = results.get("strategic_synthesis")
            resources    = results.get("input_sources", {}).get("web_search")

            result = ProjectResult(
                specification_json=(final_spec.model_dump() if final_spec else {}),
                synthesis_json=(synthesis.model_dump() if synthesis else None),
                final_review_json=(final_review.model_dump() if final_review else None),
                total_marks=(final_review.total_marks if final_review else None),
                decision=(final_review.decision if final_review else None),
                discovered_resources_json=(resources.model_dump() if resources else None),
                generated_at=datetime.utcnow(),
            )
            if db_session:
                db_session.add(result)
                db_session.commit()
                db_session.refresh(result)
                project.result_id = result.id
                db_session.commit()
            return result
        except Exception as e:
            import traceback; traceback.print_exc()
            print(f"Error saving results: {e}")
            return None

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
                target_word_count=(guidelines.target_word_count if guidelines else None),
                total_generation_time=int(duration),
                completeness_score=100,
                novelty_score=85,
            )
            if db_session:
                db_session.add(analytics)
                db_session.commit()
        except Exception as e:
            print(f"Error saving analytics: {e}")

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
            "started_at": (project.started_at.isoformat() if project.started_at else None),
            "completed_at": (project.completed_at.isoformat() if project.completed_at else None),
        }

    async def get_project_results(self, project_id: int, db_session=None):
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
            "discovered_resources": project.result.discovered_resources_json,
        }

    def _format_specification_html(self, spec) -> str:
        return f"""<div style="font-family:sans-serif">
<h1>{spec.project_title}</h1>
<h2>Abstract</h2><p>{spec.abstract.content}</p>
<h2>Justification and Overall Aim</h2><p>{spec.justification_and_aim.content}</p>
<h2>Objectives</h2><p>{spec.objectives.content}</p>
<h2>Review of Literature</h2><p>{spec.literature_review.content}</p>
<h2>Methodology</h2><p>{spec.methodology.content}</p>
<h2>Work Plan</h2><p>{spec.work_plan.content}</p>
<h2>References</h2><ol>{''.join(f'<li>{r}</li>' for r in spec.references)}</ol>
</div>"""