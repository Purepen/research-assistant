"""
Main Pipeline — REDESIGNED v2
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

    # PHASE 2: Resource Discovery + Paper Abstract Fetching
    # Skip dataset search if student already has a dataset (saves cost)
    _dataset_source = getattr(config, "dataset_source", "scout") or "scout"
    await _progress(15, "Discovering resources via web search")
    discovered_resources = await discover_resources(
        research_topic=final_topic,
        guidelines=guidelines,
        num_searches=config.num_web_searches,
        dataset_source=_dataset_source,
    )

    await _progress(22, "Fetching paper abstracts and verifying citations")
    citation_pool = await build_verified_citation_pool(
        discovered_papers=discovered_resources.papers,
        research_topic=final_topic,
        max_papers=10,
    )
    print(f"   ✅ Citation pool: {len(citation_pool)} verified papers")

    # PHASE 3: Past Projects
    stream_stats = {"user_provided_count": 0, "auto_discovered_count": 0, "final_count": 0}

    user_projects = []
    if past_project_files and config.past_projects_mode in ("user_provided", "hybrid"):
        await _progress(28, "Analysing your uploaded projects")
        user_projects = await analyze_user_dumps(
            dump_files=past_project_files,
            research_topic=final_topic,
        )
        stream_stats["user_provided_count"] = len(user_projects)
    else:
        print("\n⏭️  Stream 1: Skipped")

    auto_projects = []
    if config.past_projects_mode in ("auto_discover", "hybrid"):
        await _progress(34, "Finding similar projects online")
        auto_projects = await find_and_analyze_projects(
            research_topic=final_topic,
            guidelines=guidelines,
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
