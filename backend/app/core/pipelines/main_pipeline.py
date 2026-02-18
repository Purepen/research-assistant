"""
Main Pipeline — FULLY WIRED

All previously commented-out / placeholder phases are now active:
  Phase 2  → create_strategic_synthesis  (was None placeholder)
  Phase 3  → Stream 1: analyze_user_dumps (was pass stub)
             Stream 2: find_and_analyze_projects (was pass stub)
  Phase 5  → run_specification_with_review_loop (was {} placeholder)

Progress updates are written to the DB at each phase via an optional
`progress_callback` coroutine, so the frontend progress bar moves.
"""

from __future__ import annotations

from typing import Optional, List, Callable, Awaitable
from datetime import datetime
from docx import Document

from app.models.config import SpecificationConfig
from app.models.guidelines import ProjectGuidelines
from app.core.pipelines.phase0_workflow import parse_guidelines, handle_topic
from app.core.pipelines.phase1_workflow import (
    discover_resources,
    find_and_analyze_projects,
    analyze_user_dumps,
)
from app.core.pipelines.phase2_workflow import create_strategic_synthesis
from app.core.pipelines.phase5_workflow import run_specification_with_review_loop


# Type alias for the progress callback
ProgressCallback = Callable[[int, str], Awaitable[None]]


async def run_complete_specification_system(
    config: SpecificationConfig,
    guidelines_file: Document,
    past_project_files: Optional[List[str]] = None,
    abstract_sample: Optional[Document] = None,
    specification_rules: Optional[Document] = None,
    progress_callback: Optional[ProgressCallback] = None,
) -> dict:
    """
    Complete end-to-end specification generation system.

    Args:
        config:               System configuration
        guidelines_file:      Student's guidelines document
        past_project_files:   Optional list of past project file paths
        abstract_sample:      Optional abstract sample document
        specification_rules:  Optional specification rules document
        progress_callback:    Optional async(percentage, phase_name) → None
                              Called at every phase so the UI can update.

    Returns:
        Complete results dictionary with all generated content
    """

    async def _progress(pct: int, phase: str):
        print(f"   [{pct}%] {phase}")
        if progress_callback:
            await progress_callback(pct, phase)

    print("\n" + "=" * 80)
    print("RESEARCH SPECIFICATION ASSISTANT")
    print("=" * 80)
    print(f"\n{config}")

    start_time = datetime.now()

    # =========================================================================
    # PHASE 0: Parse Guidelines
    # =========================================================================
    print("\n📋 PHASE 0: PARSING GUIDELINES")
    print("=" * 80)

    await _progress(10, "Parsing guidelines document")
    guidelines = await parse_guidelines(guidelines_file)

    # =========================================================================
    # PHASE 1: Topic Handling
    # =========================================================================
    print("\n💡 PHASE 1: TOPIC HANDLING")
    print("=" * 80)

    await _progress(15, "Resolving research topic")
    final_topic = await handle_topic(
        field_of_study=config.field_of_study,
        research_topic=config.research_topic,
        guidelines=guidelines,
        config=config,
    )

    # =========================================================================
    # PHASE 2: Resource Discovery (web search stream)
    # =========================================================================
    print("\n🔍 PHASE 2: RESOURCE DISCOVERY")
    print("=" * 80)

    await _progress(20, "Discovering resources via web search")
    discovered_resources = await discover_resources(
        research_topic=final_topic,
        guidelines=guidelines,
        num_searches=config.num_web_searches,
    )

    # =========================================================================
    # PHASE 3: THREE-STREAM PROJECT RESEARCH
    # =========================================================================
    print("\n📚 PHASE 3: THREE-STREAM PROJECT RESEARCH")
    print("=" * 80)

    all_analyzed_projects = []
    stream_stats = {
        "user_provided_count": 0,
        "auto_discovered_count": 0,
        "duplicates_removed": 0,
        "final_count": 0,
    }

    # --- STREAM 1: User-Provided Dumps ---
    user_projects = []
    if config.past_projects_mode in ("user_provided", "hybrid"):
        print("\n📁 STREAM 1: User-Provided Dumps")
        print("-" * 80)

        if past_project_files and len(past_project_files) > 0:
            await _progress(25, f"Analysing {len(past_project_files)} user-provided project(s)")
            user_projects = await analyze_user_dumps(
                dump_files=past_project_files,
                research_topic=final_topic,
            )
            stream_stats["user_provided_count"] = len(user_projects)
            print(f"\n✅ Stream 1 complete: {len(user_projects)} projects analysed")
        else:
            print("⚠️  No user dumps provided — skipping Stream 1")
    else:
        print("\n⏭️  STREAM 1: Skipped (mode = 'auto_discover')")

    # --- STREAM 2: Auto-Discovery ---
    auto_projects = []
    if config.past_projects_mode in ("auto_discover", "hybrid"):
        print("\n🤖 STREAM 2: Auto-Discovery")
        print("-" * 80)

        await _progress(30, "Auto-discovering similar research projects")
        auto_projects = await find_and_analyze_projects(
            research_topic=final_topic,
            guidelines=guidelines,
            num_projects=config.num_auto_projects_target,
        )
        # Clamp to max_accepted
        auto_projects = auto_projects[: config.max_auto_projects_accepted]
        stream_stats["auto_discovered_count"] = len(auto_projects)
        print(f"\n✅ Stream 2 complete: {len(auto_projects)} projects discovered")
    else:
        print("\n⏭️  STREAM 2: Skipped (mode = 'user_provided')")

    # Combine streams
    all_analyzed_projects = user_projects + auto_projects
    stream_stats["final_count"] = len(all_analyzed_projects)
    print(f"\n✅ TOTAL PROJECTS FOR ANALYSIS: {len(all_analyzed_projects)}")

    # =========================================================================
    # PHASE 4: Strategic Synthesis
    # =========================================================================
    print("\n🎯 PHASE 4: STRATEGIC SYNTHESIS")
    print("=" * 80)

    await _progress(40, "Creating strategic synthesis")
    strategic_synthesis = await create_strategic_synthesis(
        research_topic=final_topic,
        discovered_resources=discovered_resources,
        analyzed_projects=all_analyzed_projects,
        guidelines=guidelines,
    )

    # =========================================================================
    # PHASE 5: Specification Generation + Review Loop
    # =========================================================================
    print("\n📝 PHASE 5: SPECIFICATION GENERATION + REVIEW LOOP")
    print("=" * 80)

    await _progress(50, "Generating specification (this takes a few minutes)")
    specification_results = await run_specification_with_review_loop(
        research_topic=final_topic,
        strategic_synthesis=strategic_synthesis,
        discovered_resources=discovered_resources,
        guidelines=guidelines,
        feasibility_calibration=None,
        config=config,
        max_iterations=config.max_iterations,
    )

    await _progress(90, "Professor review complete")

    # =========================================================================
    # PHASE 6: Email Notification (Optional)
    # =========================================================================
    if config.notification_email:
        print("\n📧 PHASE 6: EMAIL NOTIFICATION")
        print("=" * 80)
        # Email is handled by research_service after results are saved
        pass

    # =========================================================================
    # PHASE 7: Package Results
    # =========================================================================
    print("\n💾 PHASE 7: SAVING COMPLETE PACKAGE")
    print("=" * 80)

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    complete_results = {
        "config": config,
        "guidelines": guidelines,
        "topic": final_topic,
        "input_sources": {
            "user_dumps": user_projects,
            "auto_discovered": auto_projects,
            "all_analyzed_projects": all_analyzed_projects,
            "web_search": discovered_resources,
            "stream_stats": stream_stats,
        },
        "strategic_synthesis": strategic_synthesis,
        # specification_results contains: final_specification, final_review,
        # all_iterations, best_iteration_number, iterations_completed
        "specification_results": specification_results,
        "duration_seconds": duration,
    }

    print("\n" + "=" * 80)
    print("✅ SYSTEM EXECUTION COMPLETE")
    print("=" * 80)
    print(f"Duration: {duration:.1f} seconds ({duration / 60:.1f} minutes)")

    return complete_results


print("✅ Main pipeline ready")