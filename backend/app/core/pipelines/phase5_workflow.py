"""
Phase 5 Workflows — UPDATED v2

Model Tier Addition (Apr 2026):
  review_specification() and run_specification_with_review_loop() now accept
  an optional agent_model_config parameter (AgentModelConfig).

  When present:
    - review_specification() builds a tier-aware professor reviewer agent using
      the model string from agent_model_config, cloned from the module singleton
    - run_specification_with_review_loop() passes agent_model_config into
      generate_specification() (phase4) and review_specification()

  When None: all existing behaviour is unchanged — module-level singletons are used.

Original behaviour preserved:
  SpecValidationLayer still runs BEFORE professor_reviewer_agent.
  The ValidationReport is prepended to the review input as ground truth.
  The reviewer cannot approve if blockers are present.
"""

from __future__ import annotations

from typing import Optional, Union
from agents import Runner, Agent

from app.models.specification import ProjectSpecification
from app.models.review import OverallReview
from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.resources import DiscoveredResources
from app.models.config import SpecificationConfig
from app.models.locked_requirements import LockedRequirementsA, LockedRequirementsB

from app.core.agents.definitions.phase5_agents import professor_reviewer_agent
from app.core.pipelines.phase4_workflow import generate_specification
from app.core.validation.spec_validator import (
    validate_specification,
    format_report_for_reviewer,
    ValidationReport,
)

LockedRequirements = Union[LockedRequirementsA, LockedRequirementsB]


# ─── Helper: resolve tier-aware reviewer ─────────────────────────────────────

def _get_reviewer_agent(agent_model_config=None):
    """
    Return a tier-aware professor reviewer agent when agent_model_config is set,
    otherwise return the module-level singleton.

    Clones the singleton's name, instructions and output_type — only the model
    string changes. This keeps all reviewer behaviour identical regardless of tier.
    """
    if agent_model_config is None:
        return professor_reviewer_agent

    try:
        from app.models.agent_config import AgentKey
        model = agent_model_config.get(AgentKey.PROFESSOR_REVIEWER)
        if not model or model == professor_reviewer_agent.model:
            return professor_reviewer_agent
        return Agent(
            name=professor_reviewer_agent.name,
            instructions=professor_reviewer_agent.instructions,
            model=model,
            output_type=professor_reviewer_agent.output_type,
        )
    except Exception as exc:
        print(f"   ⚠️  Could not build tier-aware reviewer ({exc}) — using default")
        return professor_reviewer_agent


# ─── Targeted regeneration helpers ────────────────────────────────────────────

# Reviewer/validator section names → phase3 section dict keys
_SECTION_NAME_TO_KEY = {
    "Abstract":                      "abstract",
    "Justification and Overall Aim": "justification",
    "Justification and Aim":         "justification",
    "Justification":                 "justification",
    "Objectives":                    "objectives",
    "Review of Literature":          "literature_review",
    "Literature Review":             "literature_review",
    "Methodology":                   "methodology",
    "Work Plan":                     "work_plan",
    "References":                    "references",
}

# A section passes if it scores at least this fraction of its possible marks.
REGEN_SCORE_THRESHOLD = 0.75

_CONTENT_KEYS = ["justification", "objectives", "literature_review", "methodology", "work_plan"]


def _blocker_targets(blocker: str) -> list:
    """
    Map a validation blocker to the section key(s) that must be rewritten.

    Most blockers name their section (WORD COUNT FAIL — Abstract…,
    METHODOLOGY CHECKLIST FAIL…). CITATION FAIL is counted spec-wide and names
    none — citations live overwhelmingly in the Literature Review, so the
    deficit is routed there. Anything else unattributable falls back to every
    content section: rewriting too much is cheaper than looping max_iterations
    on a document nobody is fixing.
    """
    low = blocker.lower()
    named = [key for display, key in _SECTION_NAME_TO_KEY.items() if display.lower() in low]
    if named:
        return named
    if "citation" in low:
        return ["literature_review"]
    return list(_CONTENT_KEYS)


def _review_name_to_key(section_name: str) -> Optional[str]:
    """Map a reviewer's section name to a phase3 section key (None if unknown)."""
    name = (section_name or "").strip()
    if name in _SECTION_NAME_TO_KEY:
        return _SECTION_NAME_TO_KEY[name]
    low = name.lower()
    for display, key in _SECTION_NAME_TO_KEY.items():
        if display.lower() == low:
            return key
    for display, key in _SECTION_NAME_TO_KEY.items():
        if display.lower() in low or low in display.lower():
            return key
    return None


def sections_from_spec(spec: ProjectSpecification) -> dict:
    """
    Rebuild the phase3 section dict from a formatted specification so the next
    iteration can keep passing sections verbatim and rewrite only failed ones.
    """
    return {
        "abstract":          spec.abstract.content,
        "justification":     spec.justification_and_aim.content,
        "objectives":        spec.objectives.content,
        "literature_review": spec.literature_review.content,
        "methodology":       spec.methodology.content,
        "work_plan":         spec.work_plan.content,
        "references":        "\n".join(spec.references),
    }


def select_sections_for_regeneration(
    review: OverallReview,
    validation_report: Optional[ValidationReport] = None,
) -> tuple:
    """
    Decide which sections must be rewritten next iteration, and build the
    per-section feedback to hand their writers.

    A section is selected when its review score falls below
    REGEN_SCORE_THRESHOLD of the possible marks, or when a validation blocker
    names it (blockers are ground truth — the reviewer cannot override them).

    Returns (section_keys: set, feedback: dict section_key → feedback text).
    """
    to_regen: set = set()
    feedback: dict = {}

    for sr in review.section_reviews:
        key = _review_name_to_key(sr.section_name)
        if key is None:
            continue
        ratio = (sr.marks_awarded / sr.marks_possible) if sr.marks_possible else 0.0
        if ratio < REGEN_SCORE_THRESHOLD:
            to_regen.add(key)
            notes = [f"Score: {sr.marks_awarded}/{sr.marks_possible}."]
            if sr.weaknesses:
                notes.append("Weaknesses:\n" + "\n".join(f"  - {w}" for w in sr.weaknesses))
            if sr.recommendations:
                notes.append("Recommendations:\n" + "\n".join(f"  - {r}" for r in sr.recommendations))
            feedback[key] = "\n".join(notes)

    if validation_report is not None:
        for blocker in validation_report.blockers:
            for key in _blocker_targets(blocker):
                to_regen.add(key)
                feedback[key] = (
                    feedback.get(key, "") + f"\nVALIDATION BLOCKER (must fix): {blocker}"
                ).strip()

    return to_regen, feedback


# ─── Existing helpers — UNCHANGED ─────────────────────────────────────────────

def format_specification_for_review(spec: ProjectSpecification) -> str:
    """Format specification for professor review."""
    return f"""
PROJECT TITLE:
{spec.project_title}

ABSTRACT ({spec.abstract.word_count} words):
{spec.abstract.content}

JUSTIFICATION AND OVERALL AIM ({spec.justification_and_aim.word_count} words):
{spec.justification_and_aim.content}

OBJECTIVES ({spec.objectives.word_count} words):
{spec.objectives.content}

REVIEW OF LITERATURE ({spec.literature_review.word_count} words):
{spec.literature_review.content}

METHODOLOGY ({spec.methodology.word_count} words):
{spec.methodology.content}

WORK PLAN ({spec.work_plan.word_count} words):
{spec.work_plan.content}

REFERENCES ({len(spec.references)} citations):
{chr(10).join(spec.references)}

TOTAL WORD COUNT: {spec.total_word_count}
"""


async def review_specification(
    specification: ProjectSpecification,
    guidelines: ProjectGuidelines,
    locked: Optional[LockedRequirements] = None,
    iteration: int = 1,
    iteration_history: list = None,
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
) -> OverallReview:
    """
    Review specification with professor agent.
    ValidationReport runs first — reviewer cannot override it.

    agent_model_config: when present, uses a tier-aware reviewer agent built from
      the user's model preference. When None, uses the module-level singleton.
    """

    print(f"\n👨‍🏫 PROFESSOR REVIEW (Iteration {iteration})")
    print("-" * 80)

    # ── Step 1: Run ValidationLayer — UNCHANGED ───────────────────────────────
    print("   Running SpecValidationLayer...")

    section_word_targets = {}
    for s in guidelines.sections:
        section_word_targets[s.section_name] = s.word_count

    track     = "A"
    xai_claimed = False
    if locked:
        track = locked.track
        if locked.track == "A":
            xai_claimed = bool(getattr(locked, "xai_techniques", None))

    validation_report: ValidationReport = validate_specification(
        spec=specification,
        section_word_targets=section_word_targets,
        track=track,
        xai_claimed=xai_claimed,
    )

    report_text = format_report_for_reviewer(validation_report)

    print(f"   Validation: {'✅ PASSED' if validation_report.passes_all else '❌ BLOCKERS FOUND'}")
    if validation_report.blockers:
        for b in validation_report.blockers[:3]:
            print(f"   🔴 {b[:80]}")

    # ── Step 2: Prepare review input — UNCHANGED ──────────────────────────────
    spec_text = format_specification_for_review(specification)

    history_text = ""
    if iteration_history and len(iteration_history) > 0:
        history_text = "\n\nITERATION HISTORY:\n" + "\n".join(
            f"Iteration {it['iteration']}: {it['marks']}/100 - {it['review'].decision}"
            for it in iteration_history
        )

    review_input = f"""
{report_text}

{spec_text}

GUIDELINES:
- Project Type: {guidelines.project_type}
- Timeline: {guidelines.timeline_weeks} weeks
- Target Word Count: {guidelines.target_word_count}
- Required Sections: {', '.join(s.section_name for s in guidelines.sections)}
- Citation Style: {guidelines.citation_style}
- ITERATION: {iteration}
{history_text}

REMINDER: The ValidationReport above is ground truth.
You cannot award APPROVED if any blocker is present.
Your qualitative commentary explains WHY failures matter — it does not replace the facts.
"""

    # ── Step 3: Run professor reviewer — UPDATED (tier-aware) ─────────────────
    active_reviewer = _get_reviewer_agent(agent_model_config)

    try:
        result = await Runner.run(
            starting_agent=active_reviewer,
            input=review_input,
        )
        review = result.final_output
        print(f"   ✅ Review complete — {review.total_marks}/100 — {review.decision}")
        return review

    except Exception as exc:
        print(f"   ❌ Review failed: {exc}")
        raise


async def run_specification_with_review_loop(
    research_topic: str,
    strategic_synthesis: StrategicSynthesis,
    discovered_resources: DiscoveredResources,
    guidelines: ProjectGuidelines,
    locked: Optional[LockedRequirements],
    feasibility_calibration: Optional[object],
    config: SpecificationConfig,
    _progress_callback=None,
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
) -> dict:
    """
    Full specification generation + review loop.
    Accepts LockedRequirements and passes it to phase3 and the reviewer.

    agent_model_config: passed through to generate_specification() (phase4) and
      review_specification() so tier-aware agents are used throughout the loop.
    """

    async def _progress(pct: int, msg: str):
        if _progress_callback:
            await _progress_callback(pct, msg)

    max_iterations     = config.max_iterations
    all_iterations     = []
    current_specification = None

    for iteration in range(1, max_iterations + 1):
        print(f"\n{'=' * 80}")
        print(f"ITERATION {iteration}/{max_iterations}")
        print("=" * 80)

        await _progress(
            50 + (iteration - 1) * 10,
            f"Generating specification (iteration {iteration})...",
        )

        # ── Generate ──────────────────────────────────────────────────────────
        try:
            if iteration == 1 or current_specification is None:
                current_specification = await generate_specification(
                    research_topic=research_topic,
                    guidelines=guidelines,
                    strategic_synthesis=strategic_synthesis,
                    discovered_resources=discovered_resources,
                    feasibility_calibration=feasibility_calibration,
                    previous_feedback=None,
                    locked=locked,
                    agent_model_config=agent_model_config,   # NEW
                )
            else:
                prev             = all_iterations[-1]
                previous_review  = prev["review"]
                prev_validation  = prev.get("validation_report")

                feedback_parts = []
                if prev_validation and prev_validation.blockers:
                    feedback_parts.append(
                        "VALIDATION FAILURES TO FIX:\n"
                        + "\n".join(f"  - {b}" for b in prev_validation.blockers)
                    )
                feedback_parts.append(
                    "PROFESSOR FEEDBACK:\n"
                    + "\n".join(
                        f"  {i+1}. {p}"
                        for i, p in enumerate(previous_review.improvement_priorities)
                    )
                )
                feedback = "\n\n".join(feedback_parts)

                # Targeted regeneration: rewrite only the sections the reviewer
                # failed (References/Abstract follow automatically in phase3).
                to_regen, section_fb = select_sections_for_regeneration(
                    previous_review, prev_validation
                )
                prev_sections = sections_from_spec(prev["specification"])
                if not to_regen:
                    # Not approved, but no failing section identified — regenerate
                    # everything rather than resubmitting an identical document.
                    print("   ⚠️  No failing section identified — full regeneration")
                    prev_sections = None

                current_specification = await generate_specification(
                    research_topic=research_topic,
                    guidelines=guidelines,
                    strategic_synthesis=strategic_synthesis,
                    discovered_resources=discovered_resources,
                    feasibility_calibration=feasibility_calibration,
                    previous_feedback=feedback,   # used by the legacy (no-locked) path only
                    locked=locked,
                    agent_model_config=agent_model_config,   # NEW
                    previous_sections=prev_sections,
                    sections_to_regenerate=to_regen or None,
                    section_feedback=section_fb or None,
                )

        except Exception as exc:
            print(f"❌ Generation failed: {exc}")
            raise

        await _progress(
            60 + (iteration - 1) * 10,
            f"Reviewing specification (iteration {iteration})...",
        )

        # ── Review — UPDATED (tier-aware) ─────────────────────────────────────
        review = await review_specification(
            specification=current_specification,
            guidelines=guidelines,
            locked=locked,
            iteration=iteration,
            iteration_history=all_iterations,
            agent_model_config=agent_model_config,   # NEW
        )

        # Grab validation report for feedback next iteration
        section_word_targets = {s.section_name: s.word_count for s in guidelines.sections}
        val_report = validate_specification(
            spec=current_specification,
            section_word_targets=section_word_targets,
            track=locked.track if locked else "A",
            xai_claimed=bool(getattr(locked, "xai_techniques", None)) if locked else False,
        )

        all_iterations.append({
            "iteration":         iteration,
            "specification":     current_specification,
            "review":            review,
            "marks":             review.total_marks,
            "validation_report": val_report,
        })

        print(f"\n📊 Iteration {iteration}: {review.total_marks}/100 — {review.decision}")

        if review.decision == "APPROVED":
            print(f"\n✅ APPROVED on iteration {iteration}!")
            break

        if iteration == max_iterations:
            print(f"\n⚠️  Max iterations ({max_iterations}) reached.")

    # ── Return best iteration — UNCHANGED ────────────────────────────────────
    best = max(all_iterations, key=lambda x: x["marks"])

    print(f"\n{'=' * 80}")
    print(f"LOOP COMPLETE — Best: iteration {best['iteration']} ({best['marks']}/100)")
    print("=" * 80)

    return {
        "final_specification":   best["specification"],
        "final_review":          best["review"],
        "all_iterations":        all_iterations,
        "best_iteration_number": best["iteration"],
        "iterations_completed":  iteration,
    }