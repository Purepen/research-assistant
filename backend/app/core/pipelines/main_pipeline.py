"""
Main Pipeline — REDESIGNED v2

Critic + Humanizer Addition (Apr 2026):
  After the professor review loop completes, two new agents run:
    1. Critic       — brutal gap analysis stored as critic_json
    2. Human Writer — rewrites every section in natural human voice

  The humanized spec REPLACES specification_results["final_specification"]
  before results are returned to research_service.py.
  Both agents fail gracefully — the pipeline cannot be broken by them.
"""

from __future__ import annotations

from typing import Optional, List, Callable, Awaitable
from datetime import datetime
from docx import Document

from app.models.config import SpecificationConfig
from app.models.guidelines import ProjectGuidelines, SectionRequirement
from app.core.pipelines.phase0_workflow import parse_guidelines, handle_topic
from app.core.pipelines.phase1_workflow import (
    discover_resources,
    find_and_analyze_projects,
    analyze_user_dumps,
)
from app.core.pipelines.phase2_workflow import create_strategic_synthesis
from app.core.pipelines.phase5_workflow import run_specification_with_review_loop
from app.core.agents.definitions.phase1_paper_fetcher import build_verified_citation_pool
from app.core.pipelines.locked_requirements_builder import build_locked_requirements, detect_track
from app.core.pipelines.dataset_profiler import profile_dataset, DatasetProfile

# ── NEW: Humanizer + Critic ───────────────────────────────────────────────────
from app.core.pipelines.phase6_humanizer_critic import run_humanizer_and_critic

ProgressCallback = Callable[[int, str], Awaitable[None]]

# ─── Default guidelines ───────────────────────────────────────────────────────
_DEFAULT_GUIDELINES = ProjectGuidelines(
    sections=[
        SectionRequirement(section_name="Abstract",                  word_count=300),
        SectionRequirement(section_name="Justification and Aim",     word_count=400),
        SectionRequirement(section_name="Objectives",                word_count=300),
        SectionRequirement(section_name="Literature Review",         word_count=800),
        SectionRequirement(section_name="Methodology",               word_count=900),
        SectionRequirement(section_name="Work Plan",                 word_count=300),
    ],
    citation_style="Harvard",
    timeline_weeks=15,
    target_word_count=3000,
    project_type="mixed",
    requires_dataset=False,
    requires_methods=False,
    requires_tools=False,
    additional_requirements=[],
)


async def run_complete_specification_system(
    config: SpecificationConfig,
    guidelines_file: Optional[Document],
    past_project_files: Optional[List[str]] = None,
    progress_callback: Optional[ProgressCallback] = None,
    dataset_file_path: Optional[str] = None,
) -> dict:

    async def _progress(pct: int, phase: str):
        print(f"   [{pct}%] {phase}")
        if progress_callback:
            await progress_callback(pct, phase)

    print("\n" + "=" * 80)
    print("RESEARCH SPECIFICATION ASSISTANT v2")
    print("=" * 80)
    print(f"\n{config}")

    start_time = datetime.now()

    # PHASE 0: Parse Guidelines (optional)
    await _progress(5, "Parsing guidelines document")
    if guidelines_file is not None:
        guidelines = await parse_guidelines(guidelines_file)
        print("   ✅ Guidelines parsed from uploaded document")
    else:
        guidelines = _DEFAULT_GUIDELINES
        print("   ℹ️  No guidelines uploaded — using standard defaults")

    # PHASE 0.5: Dataset Profiling (if file uploaded)
    dataset_profile: Optional[DatasetProfile] = None
    if dataset_file_path:
        await _progress(8, "Profiling uploaded dataset")
        dataset_profile = profile_dataset(dataset_file_path)
        if dataset_profile.is_fallback:
            print(f"   ⚠️  Dataset profiling failed: {dataset_profile.error_message}")
        else:
            print(f"   ✅ Dataset: {dataset_profile.row_count:,} rows × "
                  f"{dataset_profile.column_count} cols — {dataset_profile.filename}")

    # PHASE 1: Topic Handling
    await _progress(10, "Resolving research topic")
    final_topic = await handle_topic(
        field_of_study=config.field_of_study,
        research_topic=config.research_topic,
        guidelines=guidelines,
        config=config,
    )

    # PHASE 1: Track Detection
    track = detect_track(config.field_of_study, final_topic)
    print(f"   🎯 Track detected: {track}")

    # PHASE 2: Resource Discovery
    await _progress(15, "Discovering resources and papers")
    user_projects = []
    auto_projects = []
    stream_stats  = {}

    # Stream 1 — User-provided past projects
    if past_project_files:
        await _progress(18, "Analysing your uploaded projects")
        user_projects = await analyze_user_dumps(
            file_paths=past_project_files,
            research_topic=final_topic,
        )
        stream_stats["user_provided_count"] = len(user_projects)
        print(f"   ✅ Stream 1: {len(user_projects)} user projects analysed")
    else:
        print("\n⏭️  Stream 1: No user projects uploaded")

    # Stream 3 — Web search for papers, methods, tools
    await _progress(22, "Searching the web for papers and resources")
    discovered_resources = await discover_resources(
        research_topic=final_topic,
        guidelines=guidelines,
        num_searches=config.num_web_searches,
        dataset_source=getattr(config, "dataset_source", "public"),
        track=track,
    )
    stream_stats["web_search_count"] = config.num_web_searches

    # Build verified citation pool from discovered papers
    await _progress(28, "Verifying paper citations")
    citation_pool = await build_verified_citation_pool(
        research_topic=final_topic,
        discovered_resources=discovered_resources,
    )
    print(f"   ✅ Citation pool: {len(citation_pool)} verified papers")

    # Stream 2 — Auto-discovered similar projects
    if config.past_projects_mode in ("auto", "hybrid"):
        await _progress(32, "Finding similar student projects")
        auto_projects = await find_and_analyze_projects(
            research_topic=final_topic,
            num_projects=config.num_auto_projects_target,
        )
        if config.deduplicate_auto_vs_user:
            user_titles = {p.project_title.lower() for p in user_projects}
            auto_projects = [p for p in auto_projects if p.project_title.lower() not in user_titles]
        auto_projects = auto_projects[:config.max_auto_projects_accepted]
        stream_stats["auto_discovered_count"] = len(auto_projects)
    else:
        print("\n⏭️  Stream 2: Skipped")

    all_analyzed_projects = user_projects + auto_projects
    stream_stats["final_count"] = len(all_analyzed_projects)

    # PHASE 4: Strategic Synthesis
    await _progress(40, "Creating strategic synthesis")
    strategic_synthesis = await create_strategic_synthesis(
        research_topic=final_topic,
        discovered_resources=discovered_resources,
        analyzed_projects=all_analyzed_projects,
        guidelines=guidelines,
        track=track,
        field_of_study=config.field_of_study,
    )

    # PHASE 4.5: Build Locked Requirements
    await _progress(45, "Assembling verified context for generation")
    locked = build_locked_requirements(
        field_of_study=config.field_of_study,
        research_topic=final_topic,
        academic_level=config.academic_level,
        dataset_source=getattr(config, "dataset_source", "public"),
        dataset_name=getattr(config, "dataset_name", None),
        dataset_url=getattr(config, "dataset_url", None),
        dataset_description=getattr(config, "dataset_description", None),
        dataset_size=getattr(config, "dataset_size", None),
        dataset_profile=dataset_profile,
        data_sensitivity=getattr(config, "data_sensitivity", "public"),
        student_success_statement=getattr(config, "student_success_statement", None),
        preferred_algorithms=getattr(config, "preferred_algorithms", None),
        research_nature=getattr(config, "research_nature", None),
        theoretical_framework=getattr(config, "theoretical_framework", None),
        central_argument=getattr(config, "central_argument", None),
        primary_source_focus=getattr(config, "primary_source_focus", None),
        citation_pool=citation_pool,
        analyzed_projects=all_analyzed_projects,
        guidelines=guidelines,
        synthesis=strategic_synthesis,
    )

    # PHASE 5: Specification Generation + Review Loop
    await _progress(50, "Generating specification — this takes a few minutes")
    specification_results = await run_specification_with_review_loop(
        research_topic=final_topic,
        strategic_synthesis=strategic_synthesis,
        discovered_resources=discovered_resources,
        guidelines=guidelines,
        locked=locked,
        feasibility_calibration=None,
        config=config,
        _progress_callback=progress_callback,
    )

    await _progress(90, "Professor review complete")

    # ── PHASE 6a: Critic Analysis ─────────────────────────────────────────────
    # ── PHASE 6b: Human Writer ────────────────────────────────────────────────
    #
    # Both agents run after the review loop and before results are saved.
    # The humanized spec replaces the original in specification_results.
    # The critic output is stored separately as critic_output in the dict.
    # Neither can crash the pipeline — both fail with logged errors + fallback.

    final_spec = specification_results.get("final_specification")
    if final_spec is not None:
        await _progress(92, "Running critic analysis…")
        try:
            post_results = await run_humanizer_and_critic(final_spec)

            # Replace the final spec with the humanized version
            specification_results["final_specification"] = post_results["humanized_spec"]

            # Store critic output so _save_results can persist it
            specification_results["critic_output"]       = post_results["critic_output"]
            specification_results["critic_generated_at"] = post_results["critic_generated_at"]

            await _progress(97, "Human rewrite complete")

        except Exception as exc:
            # Non-fatal — log and continue with original spec
            print(f"\n⚠️  Humanizer/Critic block failed (non-fatal): {exc}")
            specification_results["critic_output"]       = f"Analysis unavailable: {exc}"
            specification_results["critic_generated_at"] = datetime.utcnow().isoformat()
    else:
        print("\n⚠️  No final_specification found — skipping humanizer/critic")
        specification_results["critic_output"]       = "No specification to analyse."
        specification_results["critic_generated_at"] = datetime.utcnow().isoformat()

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    complete_results = {
        "config":               config,
        "guidelines":           guidelines,
        "topic":                final_topic,
        "track":                locked.track,
        "input_sources": {
            "user_dumps":            user_projects,
            "auto_discovered":       auto_projects,
            "all_analyzed_projects": all_analyzed_projects,
            "web_search":            discovered_resources,
            "stream_stats":          stream_stats,
            "citation_pool_size":    len(citation_pool),
        },
        "strategic_synthesis":   strategic_synthesis,
        "locked_requirements":   locked,
        "specification_results": specification_results,
        "duration_seconds":      duration,
    }

    print(f"\n✅ COMPLETE — {duration:.1f}s ({duration / 60:.1f} min)")
    return complete_results


print("✅ Main pipeline v2 ready")