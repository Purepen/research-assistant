"""
Main Pipeline — v4

BYOK + Model Tier Addition — COMPLETE (Apr 2026):
  agent_model_config is now passed into EVERY phase:
    Phase 1: discover_resources(), analyze_user_dumps(), find_and_analyze_projects()
    Phase 2: create_strategic_synthesis()
    Phase 3/4/5: run_specification_with_review_loop() → generate_specification()
                  → generate_specification_sections()
    Phase 6: run_humanizer_and_critic()

  All phases use tier-aware agents when config is present.
  All phases fall back to module-level singletons when config is None.

Fixes vs v3:
  1. analyze_user_dumps() — corrected param: dump_files= (not file_paths=)
  2. find_and_analyze_projects() — restored guidelines= param
  3. discover_resources() — dataset_source now reads from _dataset_source local
     (matches original pipeline logic)
  4. run_specification_with_review_loop() — agent_model_config now passed through
     (phase5_workflow.py has been updated to accept it)
  5. Phase 1/2 calls now all pass agent_model_config=agent_model_config
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
from app.core.pipelines.phase6_humanizer_critic import run_humanizer_and_critic

ProgressCallback = Callable[[int, str], Awaitable[None]]


# ─── Default guidelines ───────────────────────────────────────────────────────

_DEFAULT_GUIDELINES = ProjectGuidelines(
    sections=[
        SectionRequirement(section_name="Abstract",              word_count=300),
        SectionRequirement(section_name="Justification and Aim", word_count=400),
        SectionRequirement(section_name="Objectives",            word_count=300),
        SectionRequirement(section_name="Literature Review",     word_count=800),
        SectionRequirement(section_name="Methodology",           word_count=900),
        SectionRequirement(section_name="Work Plan",             word_count=300),
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


# ─── Main entry point ─────────────────────────────────────────────────────────

async def run_complete_specification_system(
    config: SpecificationConfig,
    guidelines_file: Optional[Document],
    past_project_files: Optional[List[str]] = None,
    progress_callback: Optional[ProgressCallback] = None,
    dataset_file_path: Optional[str] = None,
    agent_model_config=None,   # Optional[AgentModelConfig]
) -> dict:
    """
    Full specification generation pipeline.

    agent_model_config: AgentModelConfig built from the user's DB settings.
      Passed into every phase. When None, every phase uses module-level singletons.
    """

    async def _progress(pct: int, phase: str):
        print(f"   [{pct}%] {phase}")
        if progress_callback:
            await progress_callback(pct, phase)

    print("\n" + "=" * 80)
    print("RESEARCH SPECIFICATION ASSISTANT v4")
    print("=" * 80)
    print(f"\n{config}")
    if agent_model_config:
        from app.models.agent_config import AgentKey
        reviewer_model = agent_model_config.get(AgentKey.PROFESSOR_REVIEWER)
        web_model      = agent_model_config.get(AgentKey.WEB_SEARCHER)
        print(f"   🤖 Model config active — web: {web_model} | reviewer: {reviewer_model}")

    start_time = datetime.now()

    # ── PHASE 0: Parse guidelines ──────────────────────────────────────────────
    await _progress(5, "Parsing guidelines document")
    if guidelines_file is not None:
        guidelines = await parse_guidelines(guidelines_file)
        print("   ✅ Guidelines parsed from uploaded document")
    else:
        guidelines = _DEFAULT_GUIDELINES
        print("   ℹ️  No guidelines uploaded — using standard defaults")

    # ── PHASE 0.5: Dataset profiling ──────────────────────────────────────────
    dataset_profile: Optional[DatasetProfile] = None
    if dataset_file_path:
        await _progress(8, "Profiling uploaded dataset")
        dataset_profile = profile_dataset(dataset_file_path)
        if dataset_profile.is_fallback:
            print(f"   ⚠️  Dataset profiling failed: {dataset_profile.error_message}")
        else:
            print(
                f"   ✅ Dataset: {dataset_profile.row_count:,} rows × "
                f"{dataset_profile.column_count} cols — {dataset_profile.filename}"
            )

    # ── PHASE 1: Topic handling ────────────────────────────────────────────────
    await _progress(10, "Resolving research topic")
    final_topic = await handle_topic(
        field_of_study=config.field_of_study,
        research_topic=config.research_topic,
        guidelines=guidelines,
        config=config,
    )

    # ── Track detection ────────────────────────────────────────────────────────
    track = detect_track(config.field_of_study, final_topic)
    print(f"   🎯 Track detected: {track}")

    # ── PHASE 1: Resource discovery ────────────────────────────────────────────
    # Skip dataset search if student already has a dataset (saves cost)
    _dataset_source = getattr(config, "dataset_source", "scout") or "scout"

    await _progress(15, "Discovering resources via web search")
    discovered_resources = await discover_resources(
        research_topic=final_topic,
        guidelines=guidelines,
        num_searches=config.num_web_searches,
        dataset_source=_dataset_source,
        agent_model_config=agent_model_config,   # ← WIRED
    )

    # Citation pool
    await _progress(22, "Fetching paper abstracts and verifying citations")
    citation_pool = await build_verified_citation_pool(
        discovered_papers=discovered_resources.papers,
        research_topic=final_topic,
        max_papers=10,
    )
    print(f"   ✅ Citation pool: {len(citation_pool)} verified papers")

    # ── PHASE 1: Past project streams ─────────────────────────────────────────
    stream_stats = {"user_provided_count": 0, "auto_discovered_count": 0, "final_count": 0}

    # Stream 1 — User-provided past projects
    user_projects = []
    if past_project_files and config.past_projects_mode in ("user_provided", "hybrid"):
        await _progress(28, "Analysing your uploaded projects")
        user_projects = await analyze_user_dumps(
            dump_files=past_project_files,           # ← FIXED: was file_paths=
            research_topic=final_topic,
            agent_model_config=agent_model_config,   # ← WIRED
        )
        stream_stats["user_provided_count"] = len(user_projects)
        print(f"   ✅ Stream 1: {len(user_projects)} user projects analysed")
    else:
        print("\n⏭️  Stream 1: Skipped")

    # Stream 2 — Auto-discovered similar projects
    auto_projects = []
    if config.past_projects_mode in ("auto_discover", "hybrid"):
        await _progress(34, "Finding similar projects online")
        auto_projects = await find_and_analyze_projects(
            research_topic=final_topic,
            guidelines=guidelines,                   # ← FIXED: was missing
            num_projects=config.num_auto_projects_target,
            agent_model_config=agent_model_config,   # ← WIRED
        )
        if config.deduplicate_auto_vs_user:
            user_titles   = {p.project_title.lower() for p in user_projects}
            auto_projects = [p for p in auto_projects if p.project_title.lower() not in user_titles]
        auto_projects = auto_projects[:config.max_auto_projects_accepted]
        stream_stats["auto_discovered_count"] = len(auto_projects)
        print(f"   ✅ Stream 2: {len(auto_projects)} projects found")
    else:
        print("\n⏭️  Stream 2: Skipped")

    all_analyzed_projects = user_projects + auto_projects
    stream_stats["final_count"] = len(all_analyzed_projects)

    # ── PHASE 2: Strategic synthesis ──────────────────────────────────────────
    await _progress(40, "Creating strategic synthesis")
    strategic_synthesis = await create_strategic_synthesis(
        research_topic=final_topic,
        discovered_resources=discovered_resources,
        analyzed_projects=all_analyzed_projects,
        guidelines=guidelines,
        track=track,
        field_of_study=config.field_of_study,
        agent_model_config=agent_model_config,   # ← WIRED
    )

    # ── PHASE 3: Build locked requirements ────────────────────────────────────
    await _progress(45, "Assembling verified context for generation")
    locked = build_locked_requirements(
        field_of_study=config.field_of_study,
        research_topic=final_topic,
        academic_level=config.academic_level,
        dataset_source=_dataset_source,
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

    # ── PHASE 4/5: Specification generation + review loop ─────────────────────
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
        agent_model_config=agent_model_config,   # ← WIRED (phase5 now accepts it)
    )

    await _progress(90, "Professor review complete")

    # ── PHASE 6: Critic + Human Writer ────────────────────────────────────────
    final_spec = specification_results.get("final_specification")
    if final_spec is not None:
        await _progress(92, "Running critic analysis…")
        try:
            post_results = await run_humanizer_and_critic(
                spec=final_spec,
                agent_model_config=agent_model_config,   # ← WIRED
            )
            specification_results["final_specification"] = post_results["humanized_spec"]
            specification_results["critic_output"]       = post_results["critic_output"]
            specification_results["critic_generated_at"] = post_results["critic_generated_at"]
            await _progress(97, "Human rewrite complete")
        except Exception as exc:
            print(f"\n⚠️  Humanizer/Critic block failed (non-fatal): {exc}")
            specification_results["critic_output"]       = f"Analysis unavailable: {exc}"
            specification_results["critic_generated_at"] = datetime.utcnow().isoformat()
    else:
        print("\n⚠️  No final_specification — skipping humanizer/critic")
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


print("✅ Main pipeline v4 ready")