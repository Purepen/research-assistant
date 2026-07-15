"""
Research Service — UPDATED v6

Changes vs v5 (BYOK + Model Tier wiring):

  1. generate_specification:
       - Queries the User row from the DB using project.user_id
       - If user.openai_api_key is set, calls set_default_openai_key() from the
         OpenAI Agents SDK before the pipeline runs. This makes every Runner.run()
         call in the pipeline — across all phases — use the user's own key.
       - Falls back to the system OPENAI_API_KEY env var if no user key is set.
       - Builds an AgentModelConfig from the user's model_tier + custom_model_config
         using build_agent_config_for_user().
       - Passes agent_model_config into run_complete_specification_system().

  2. _save_results: saves critic_json (unchanged from v5).

  3. Email: uses _format_full_email_html (unchanged from v5).

  4. _format_specification_html / _format_full_email_html: preserved verbatim.

  All other methods (create_project, get_project_status, get_project_results,
  _save_analytics) are preserved verbatim.
"""

from __future__ import annotations

import os
from typing import Optional, Dict, List
from datetime import datetime

from app.models.config import SpecificationConfig
from app.models.database import Project, ProjectResult, ProjectAnalytics, ProjectStatus, User
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
        dataset_file_path: Optional[str] = None,
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

    # ── generate_specification ────────────────────────────────────────────────

    async def generate_specification(
        self,
        project: Project,
        config: SpecificationConfig,
        db_session=None,
        dataset_file_path: Optional[str] = None,
    ):
        async def _progress(pct: int, phase: str):
            project.progress_percentage = pct
            project.current_phase       = phase
            if db_session:
                try:
                    db_session.commit()
                except Exception:
                    pass

        try:
            project.status     = ProjectStatus.GENERATING
            project.started_at = datetime.utcnow()
            if db_session:
                db_session.commit()

            # ── Load guidelines doc ────────────────────────────────────────────
            guidelines_doc = None
            if project.guidelines_file_path:
                try:
                    from docx import Document
                    guidelines_doc = Document(project.guidelines_file_path)
                    print(f"   ✅ Guidelines loaded: {project.guidelines_file_path}")
                except Exception as exc:
                    print(f"   ⚠️  Could not load guidelines ({exc}) — using defaults")

            # ── Resolve user's API key and model tier ──────────────────────────
            #
            # Look up the user row so we can read openai_api_key and model_tier.
            # These are stored per-user in the DB and not passed through config.
            agent_model_config = None
            user_key_used      = False

            if db_session:
                user = db_session.query(User).filter(User.id == project.user_id).first()

                if user:
                    # No try/except here: apply_openai_key raises if the user's
                    # stored key can't be decrypted, their free spec-generation
                    # trial credit is already spent, or REQUIRE_BYOK blocks the
                    # system key — the run must fail with that clear message,
                    # not silently fall through and bill the system key (this
                    # is also what closes the gap where REQUIRE_BYOK protected
                    # Topic Lab but not the paid generation path).
                    from app.utils.openai_key import apply_openai_key
                    user_key_used = apply_openai_key(user, db_session=db_session, credit_kind="spec")

                    # ── Model tier: build AgentModelConfig ─────────────────────
                    from app.models.agent_config import build_agent_config_for_user
                    agent_model_config = build_agent_config_for_user(
                        model_tier=user.model_tier or "production",
                        custom_model_config=user.custom_model_config,
                    )
                    print(f"   🤖 Model tier: {user.model_tier or 'production'}")

            # ── Run pipeline ───────────────────────────────────────────────────
            start_time = datetime.utcnow()

            results = await run_complete_specification_system(
                config=config,
                guidelines_file=guidelines_doc,
                past_project_files=project.user_dumps_paths or [],
                progress_callback=_progress,
                dataset_file_path=dataset_file_path,
                agent_model_config=agent_model_config,   # NEW — passes tier config in
            )

            duration = (datetime.utcnow() - start_time).total_seconds()

            # ── If we set the user's key, restore the system key ───────────────
            # This prevents the user's key from leaking into other requests
            # that share this process (relevant for concurrent generations).
            if user_key_used:
                try:
                    from agents import set_default_openai_key
                    system_key = os.environ.get("OPENAI_API_KEY", "")
                    if system_key:
                        set_default_openai_key(system_key)
                except Exception:
                    pass

            # Guard against resurrecting a cancellation: /cancel writes FAILED
            # from a different DB session/connection, so re-read this row
            # before unconditionally overwriting it back to COMPLETE.
            if db_session:
                db_session.refresh(project)
                if project.status == ProjectStatus.FAILED:
                    return {
                        "success":    False,
                        "error":      "cancelled",
                        "project_id": project.id,
                        "status":     "cancelled",
                    }

            project.status              = ProjectStatus.COMPLETE
            project.progress_percentage = 100
            project.current_phase       = "Complete"
            project.completed_at        = datetime.utcnow()
            if db_session:
                db_session.commit()

            result_obj = await self._save_results(project, results, db_session)
            await self._save_analytics(project, results, duration, config, db_session)

            # ── Email notification ─────────────────────────────────────────────
            spec_results = results.get("specification_results") or {}
            if config.notification_email and spec_results.get("final_specification"):
                try:
                    email        = self._get_email()
                    final_spec   = spec_results["final_specification"]
                    final_review = spec_results.get("final_review")
                    critic_text  = spec_results.get("critic_output", "")

                    email_result = email.send_specification_email(
                        to=config.notification_email,
                        project_title=results.get("topic", "Research Specification"),
                        specification_html=self._format_full_email_html(
                            spec=final_spec,
                            review=final_review,
                            critic_text=critic_text,
                        ),
                        marks=final_review.total_marks if final_review else 0,
                        decision=final_review.decision  if final_review else "UNKNOWN",
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
            project.status        = ProjectStatus.FAILED
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
        Save spec + review + critic to ProjectResult row.
        ProjectResult has NO project_id column.
        Link is one-way: Project.result_id → ProjectResult.id
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

            critic_text = spec_results.get("critic_output")
            critic_at   = spec_results.get("critic_generated_at")
            critic_dict = None
            if critic_text:
                critic_dict = {
                    "text":         critic_text,
                    "generated_at": critic_at or datetime.utcnow().isoformat(),
                }

            result = ProjectResult(
                specification_json=(final_spec.model_dump() if final_spec else {}),
                synthesis_json=(synthesis.model_dump() if synthesis else None),
                final_review_json=review_dict,
                total_marks=(final_review.total_marks if final_review else None),
                decision=(final_review.decision     if final_review else None),
                critic_json=critic_dict,
                discovered_resources_json=(resources.model_dump() if resources else None),
                generated_at=datetime.utcnow(),
            )

            if db_session:
                db_session.add(result)
                db_session.commit()
                db_session.refresh(result)
                project.result_id = result.id
                db_session.commit()
                print(
                    f"   ✅ Results saved — ProjectResult id={result.id}, "
                    f"linked to Project id={project.id}"
                    + (f", critic: {len(critic_text):,} chars" if critic_text else ", no critic")
                )
            return result

        except Exception as exc:
            traceback.print_exc()
            print(f"❌ _save_results FAILED: {exc}")
            return None

    # ── _save_analytics ────────────────────────────────────────────────────────

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
            "critic":               project.result.critic_json,
            "total_marks":          project.result.total_marks,
            "decision":             project.result.decision,
            "discovered_resources": project.result.discovered_resources_json,
        }

    # ── Email formatters — UNCHANGED ──────────────────────────────────────────

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

    def _format_full_email_html(
        self,
        spec,
        review=None,
        critic_text: Optional[str] = None,
    ) -> str:
        """
        Full HTML document: Specification + AI Review + Critic Analysis.
        Used for both email delivery and as the source of truth for DOCX content.
        """
        try:
            nl = "<br>"

            html = f"<h1 style='color:#0f1f0f'>{spec.project_title}</h1>\n"

            sections = [
                ("Abstract",              spec.abstract.content),
                ("Justification and Aim", spec.justification_and_aim.content),
                ("Objectives",            spec.objectives.content),
                ("Review of Literature",  spec.literature_review.content),
                ("Methodology",           spec.methodology.content),
                ("Work Plan",             spec.work_plan.content),
            ]
            for name, content in sections:
                html += (
                    f"<h2 style='color:#16a34a;margin-top:32px'>{name}</h2>\n"
                    f"<p style='line-height:1.8'>{(content or '').replace(chr(10), nl)}</p>\n"
                )

            if spec.references:
                html += "<h2 style='color:#16a34a;margin-top:32px'>References</h2>\n<ol>\n"
                for ref in spec.references:
                    html += f"  <li style='margin-bottom:6px'>{ref}</li>\n"
                html += "</ol>\n"

            if review:
                html += (
                    "<hr style='margin:40px 0;border-color:#e8ede8'>\n"
                    "<h1 style='color:#0369a1'>AI Professor Review</h1>\n"
                )
                try:
                    html += (
                        f"<p><strong>Score:</strong> {review.total_marks}/100 "
                        f"&nbsp;&nbsp; <strong>Decision:</strong> {review.decision}</p>\n"
                    )
                    if hasattr(review, "supervisor_comments") and review.supervisor_comments:
                        html += (
                            "<h2 style='color:#0369a1'>Overall Assessment</h2>\n"
                            f"<p>{review.supervisor_comments.replace(chr(10), nl)}</p>\n"
                        )
                    if hasattr(review, "overall_strengths") and review.overall_strengths:
                        html += "<h2 style='color:#16a34a'>Strengths</h2>\n<ul>\n"
                        for s in review.overall_strengths:
                            html += f"  <li>{s}</li>\n"
                        html += "</ul>\n"
                    if hasattr(review, "critical_issues") and review.critical_issues:
                        html += "<h2 style='color:#dc2626'>Critical Issues</h2>\n<ul>\n"
                        for issue in review.critical_issues:
                            html += f"  <li>{issue}</li>\n"
                        html += "</ul>\n"
                    if hasattr(review, "improvement_priorities") and review.improvement_priorities:
                        html += "<h2 style='color:#d97706'>Areas for Improvement</h2>\n<ul>\n"
                        for p in review.improvement_priorities:
                            html += f"  <li>{p}</li>\n"
                        html += "</ul>\n"
                    if hasattr(review, "section_reviews") and review.section_reviews:
                        html += "<h2 style='color:#0369a1'>Section Scores</h2>\n<table style='border-collapse:collapse;width:100%'>\n"
                        html += "  <tr style='background:#f0f4ff'><th style='padding:8px;text-align:left'>Section</th><th style='padding:8px'>Score</th></tr>\n"
                        for sr in review.section_reviews:
                            html += f"  <tr><td style='padding:8px;border-top:1px solid #e8ede8'>{sr.section_name}</td><td style='padding:8px;text-align:center'>{sr.marks_awarded}/{sr.marks_possible}</td></tr>\n"
                        html += "</table>\n"
                except Exception as rev_exc:
                    html += f"<p>Review data partially unavailable: {rev_exc}</p>\n"

            if critic_text:
                html += (
                    "<hr style='margin:40px 0;border-color:#e8ede8'>\n"
                    "<h1 style='color:#7c3aed'>Critic Analysis</h1>\n"
                    "<p style='color:#6b7280;font-size:.9em'>"
                    "Brutal, honest gap analysis — every weakness and what to fix."
                    "</p>\n"
                    f"<pre style='white-space:pre-wrap;font-family:inherit;line-height:1.7;"
                    f"background:#faf5ff;padding:20px;border-radius:8px;"
                    f"border-left:4px solid #7c3aed'>{critic_text}</pre>\n"
                )

            return html

        except Exception as exc:
            return f"<p>Specification generated. (HTML formatting error: {exc})</p>"