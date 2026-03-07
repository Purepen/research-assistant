"""
Phase 5 Workflows — UPDATED

Key change: SpecValidationLayer runs BEFORE professor_reviewer_agent.
The ValidationReport is prepended to the review input as ground truth.
The reviewer cannot approve if blockers are present.
"""

from __future__ import annotations

from typing import Optional, Union
from agents import Runner

from app.models.specification import ProjectSpecification
from app.models.review import OverallReview
from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.resources import DiscoveredResources
from app.models.config import SpecificationConfig
from app.models.locked_requirements import LockedRequirementsA, LockedRequirementsB

from app.core.agents.definitions.phase5_agents import professor_reviewer_agent
from app.core.pipelines.phase4_workflow import generate_specification, create_context_for_agents
from app.core.validation.spec_validator import (
    validate_specification,
    format_report_for_reviewer,
    ValidationReport,
)

LockedRequirements = Union[LockedRequirementsA, LockedRequirementsB]


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
) -> OverallReview:
    """
    Review specification with professor agent.
    ValidationReport runs first — reviewer cannot override it.
    """

    print(f"\n👨‍🏫 PROFESSOR REVIEW (Iteration {iteration})")
    print("-" * 80)

    # ── Step 1: Run ValidationLayer ───────────────────────────────────────────
    print("   Running SpecValidationLayer...")

    # Build section word targets from guidelines
    section_word_targets = {}
    for s in guidelines.sections:
        section_word_targets[s.section_name] = s.word_count

    # Determine track and XAI flag
    track = "A"
    xai_claimed = False
    if locked:
        track = locked.track
        if locked.track == "A":
            xai_claimed = bool(
                getattr(locked, "xai_techniques", None)
            )

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

    # ── Step 2: Prepare review input with report prepended ───────────────────
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

    # ── Step 3: Run professor reviewer ───────────────────────────────────────
    try:
        result = await Runner.run(
            starting_agent=professor_reviewer_agent,
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
) -> dict:
    """
    Full specification generation + review loop.
    Now accepts LockedRequirements and passes it to phase3 and the reviewer.
    """

    async def _progress(pct: int, msg: str):
        if _progress_callback:
            await _progress_callback(pct, msg)

    max_iterations = config.max_iterations
    all_iterations = []
    current_specification = None

    for iteration in range(1, max_iterations + 1):
        print(f"\n{'=' * 80}")
        print(f"ITERATION {iteration}/{max_iterations}")
        print("=" * 80)

        await _progress(
            50 + (iteration - 1) * 10,
            f"Generating specification (iteration {iteration})..."
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
                )
            else:
                # Build feedback from previous review
                prev = all_iterations[-1]
                previous_review = prev["review"]
                prev_validation = prev.get("validation_report")

                feedback_parts = []
                if prev_validation and prev_validation.blockers:
                    feedback_parts.append(
                        "VALIDATION FAILURES TO FIX:\n" +
                        "\n".join(f"  - {b}" for b in prev_validation.blockers)
                    )
                feedback_parts.append(
                    "PROFESSOR FEEDBACK:\n" +
                    "\n".join(
                        f"  {i+1}. {p}"
                        for i, p in enumerate(previous_review.improvement_priorities)
                    )
                )
                feedback = "\n\n".join(feedback_parts)

                current_specification = await generate_specification(
                    research_topic=research_topic,
                    guidelines=guidelines,
                    strategic_synthesis=strategic_synthesis,
                    discovered_resources=discovered_resources,
                    feasibility_calibration=feasibility_calibration,
                    previous_feedback=feedback,
                    locked=locked,
                )

        except Exception as exc:
            print(f"❌ Generation failed: {exc}")
            raise

        await _progress(
            60 + (iteration - 1) * 10,
            f"Reviewing specification (iteration {iteration})..."
        )

        # ── Review (with ValidationReport) ───────────────────────────────────
        review = await review_specification(
            specification=current_specification,
            guidelines=guidelines,
            locked=locked,
            iteration=iteration,
            iteration_history=all_iterations,
        )

        # Grab the validation report from the reviewer step for feedback next iteration
        section_word_targets = {s.section_name: s.word_count for s in guidelines.sections}
        val_report = validate_specification(
            spec=current_specification,
            section_word_targets=section_word_targets,
            track=locked.track if locked else "A",
            xai_claimed=bool(getattr(locked, "xai_techniques", None)) if locked else False,
        )

        all_iterations.append({
            "iteration":          iteration,
            "specification":      current_specification,
            "review":             review,
            "marks":              review.total_marks,
            "validation_report":  val_report,
        })

        print(f"\n📊 Iteration {iteration}: {review.total_marks}/100 — {review.decision}")

        if review.decision == "APPROVED":
            print(f"\n✅ APPROVED on iteration {iteration}!")
            break

        if iteration == max_iterations:
            print(f"\n⚠️  Max iterations ({max_iterations}) reached.")

    # Return best iteration
    best = max(all_iterations, key=lambda x: x["marks"])

    print(f"\n{'=' * 80}")
    print(f"LOOP COMPLETE — Best: iteration {best['iteration']} ({best['marks']}/100)")
    print("=" * 80)

    return {
        "final_specification":     best["specification"],
        "final_review":            best["review"],
        "all_iterations":          all_iterations,
        "best_iteration_number":   best["iteration"],
        "iterations_completed":    iteration,
    }
