"""
Phase 6 — Humanizer + Critic Workflow
=======================================
File: backend/app/core/pipelines/phase6_humanizer_critic.py

Runs after the professor review loop (Phase 5) and before results are saved.

Step 1 — Critic:
  Runs brutal gap analysis on the assembled specification.
  Output is stored as critic_json in the database and shown in the
  dashboard "Critic" tab.

Step 2 — Human Writer:
  Rewrites each section individually in natural human voice.
  Removes em-dashes, AI writing patterns, robotic transitions.
  The humanized spec REPLACES the original in the pipeline results.
  This is the version saved to the database, shown on the dashboard,
  downloaded as DOCX, and sent by email.

Both agents fail gracefully — if either crashes, the original spec and an
error message are returned instead. The pipeline never stops because of them.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from agents import Runner

from app.models.specification import ProjectSpecification, SpecificationSection
from app.core.agents.definitions.post_agents import critic_agent, human_writer_agent


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _format_spec_for_agents(spec: ProjectSpecification) -> str:
    """Convert a ProjectSpecification into readable text for agent input."""
    sections = [
        ("ABSTRACT",                    spec.abstract.content),
        ("JUSTIFICATION AND AIM",       spec.justification_and_aim.content),
        ("OBJECTIVES",                  spec.objectives.content),
        ("LITERATURE REVIEW",           spec.literature_review.content),
        ("METHODOLOGY",                 spec.methodology.content),
        ("WORK PLAN",                   spec.work_plan.content),
    ]
    lines = [
        f"PROJECT TITLE: {spec.project_title}",
        f"TOTAL WORD COUNT: {spec.total_word_count}",
        "",
    ]
    for name, content in sections:
        lines.append("=" * 60)
        lines.append(name)
        lines.append("=" * 60)
        lines.append(content or "(empty)")
        lines.append("")

    if spec.references:
        lines.append("=" * 60)
        lines.append("REFERENCES")
        lines.append("=" * 60)
        lines.extend(spec.references)

    return "\n".join(lines)


def _rebuild_spec(
    original: ProjectSpecification,
    abstract: str,
    justification: str,
    objectives: str,
    literature: str,
    methodology: str,
    work_plan: str,
) -> ProjectSpecification:
    """
    Reconstruct a ProjectSpecification from humanized section strings.
    Word counts are recomputed. Key points and references are preserved verbatim.
    """
    def _wc(text: str) -> int:
        return len(text.split()) if text else 0

    return ProjectSpecification(
        project_title=original.project_title,
        abstract=SpecificationSection(
            section_name=original.abstract.section_name,
            content=abstract,
            word_count=_wc(abstract),
            key_points=original.abstract.key_points,
        ),
        justification_and_aim=SpecificationSection(
            section_name=original.justification_and_aim.section_name,
            content=justification,
            word_count=_wc(justification),
            key_points=original.justification_and_aim.key_points,
        ),
        objectives=SpecificationSection(
            section_name=original.objectives.section_name,
            content=objectives,
            word_count=_wc(objectives),
            key_points=original.objectives.key_points,
        ),
        literature_review=SpecificationSection(
            section_name=original.literature_review.section_name,
            content=literature,
            word_count=_wc(literature),
            key_points=original.literature_review.key_points,
        ),
        methodology=SpecificationSection(
            section_name=original.methodology.section_name,
            content=methodology,
            word_count=_wc(methodology),
            key_points=original.methodology.key_points,
        ),
        work_plan=SpecificationSection(
            section_name=original.work_plan.section_name,
            content=work_plan,
            word_count=_wc(work_plan),
            key_points=original.work_plan.key_points,
        ),
        references=original.references,
        total_word_count=(
            _wc(abstract)
            + _wc(justification)
            + _wc(objectives)
            + _wc(literature)
            + _wc(methodology)
            + _wc(work_plan)
        ),
    )


# ─── Critic ──────────────────────────────────────────────────────────────────

async def run_critic(spec: ProjectSpecification) -> str:
    """
    Run the brutal gap analysis critic on the assembled specification.
    Returns the critic's plain-text output as a string.
    """
    spec_text = _format_spec_for_agents(spec)
    result = await Runner.run(
        starting_agent=critic_agent,
        input=(
            "Analyse this research specification section by section. "
            "Be brutal and specific. Do not soften anything.\n\n"
            + spec_text
        ),
    )
    return str(result.final_output)


# ─── Human Writer ─────────────────────────────────────────────────────────────

async def _humanize_section(content: str, section_name: str) -> str:
    """
    Rewrite one section in human voice.
    Falls back to original content if the agent fails or returns empty output.
    """
    if not content or len(content.strip()) < 50:
        return content

    result = await Runner.run(
        starting_agent=human_writer_agent,
        input=(
            f"Rewrite this {section_name} section in natural human voice. "
            "Apply every rule strictly: no em-dashes, no AI writing patterns, "
            "no robotic transitions, no summarising sentences at section ends. "
            "Return ONLY the rewritten prose — no labels, no commentary, "
            "no preamble, no explanation.\n\n"
            + content
        ),
    )
    humanized = str(result.final_output).strip()

    # Safety: if agent returns empty or clearly wrong output, use original
    if len(humanized) < len(content) * 0.4:
        print(f"   ⚠️  Humanizer returned suspiciously short output for {section_name} — keeping original")
        return content

    return humanized


async def run_humanizer(spec: ProjectSpecification) -> ProjectSpecification:
    """
    Rewrite every prose section of the specification in human voice.
    Sections are processed sequentially for reliability.
    References are never touched — only prose content is rewritten.
    """
    print("   Humanizing: Abstract")
    abstract      = await _humanize_section(spec.abstract.content,                  "Abstract")

    print("   Humanizing: Justification and Aim")
    justification = await _humanize_section(spec.justification_and_aim.content,     "Justification and Aim")

    print("   Humanizing: Objectives")
    objectives    = await _humanize_section(spec.objectives.content,                "Objectives")

    print("   Humanizing: Literature Review")
    literature    = await _humanize_section(spec.literature_review.content,         "Literature Review")

    print("   Humanizing: Methodology")
    methodology   = await _humanize_section(spec.methodology.content,               "Methodology")

    print("   Humanizing: Work Plan")
    work_plan     = await _humanize_section(spec.work_plan.content,                 "Work Plan")

    return _rebuild_spec(
        original=spec,
        abstract=abstract,
        justification=justification,
        objectives=objectives,
        literature=literature,
        methodology=methodology,
        work_plan=work_plan,
    )


# ─── Main entry point ─────────────────────────────────────────────────────────

async def run_humanizer_and_critic(spec: ProjectSpecification) -> dict:
    """
    Run both post-assembly agents on the final specification.

    Called by main_pipeline.py after run_specification_with_review_loop returns.

    Returns a dict with:
        humanized_spec      — ProjectSpecification with rewritten prose
        critic_output       — str, the brutal gap analysis text
        critic_generated_at — ISO timestamp string

    Neither agent can crash the pipeline. Both fail gracefully.
    """

    # ── Step 1: Critic ────────────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("PHASE 6a — CRITIC ANALYSIS")
    print("=" * 80)

    critic_output: str
    try:
        critic_output = await run_critic(spec)
        print(f"   ✅ Critic complete — {len(critic_output):,} characters")
    except Exception as exc:
        print(f"   ❌ Critic failed: {exc}")
        critic_output = (
            f"Critic analysis could not complete for this specification.\n"
            f"Error: {exc}\n\n"
            "Please review the specification manually against the marking criteria."
        )

    # ── Step 2: Human Writer ──────────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("PHASE 6b — HUMAN WRITER")
    print("=" * 80)

    humanized_spec: ProjectSpecification
    try:
        humanized_spec = await run_humanizer(spec)
        print(
            f"   ✅ Humanizer complete — "
            f"{humanized_spec.total_word_count:,} words "
            f"(was {spec.total_word_count:,})"
        )
    except Exception as exc:
        print(f"   ❌ Humanizer failed: {exc} — keeping original spec")
        humanized_spec = spec

    return {
        "humanized_spec":       humanized_spec,
        "critic_output":        critic_output,
        "critic_generated_at":  datetime.utcnow().isoformat(),
    }