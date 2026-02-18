"""
Phase 4 Workflows — FIXED

Problem: Generated specs were ~848 words instead of the 3000-word target.
Root cause: The orchestrator instruction said "Check word count?" but no
  enforcement existed. The formatter accepted whatever was given.

Fix:
  1. create_context_for_agents() now includes EXPLICIT per-section word count
     targets with concrete minimum floors.
  2. generate_specification() validates total word count after formatting.
     If total < 70% of target, it runs a single expansion pass where each
     short section is explicitly expanded via the formatter again.
  3. The formatter prompt is strengthened with a strict MINIMUM word count
     requirement per section.
"""

from __future__ import annotations

from agents import Runner
from app.models.specification import ProjectSpecification
from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.resources import DiscoveredResources
from app.core.agents.definitions.phase4_agents import (
    specification_orchestrator,
    specification_formatter,
)


def create_context_for_agents(
    research_topic: str,
    guidelines: ProjectGuidelines,
    discovered_resources: DiscoveredResources,
    strategic_synthesis: StrategicSynthesis,
    feasibility_calibration=None,
) -> str:
    """Create comprehensive context string — includes strict word count targets."""

    # Build per-section word count table from guidelines
    section_targets = "\n".join(
        f"  • {s.section_name}: MINIMUM {s.word_count} words (write MORE if needed)"
        for s in guidelines.sections
    )

    context = f"""
RESEARCH TOPIC: {research_topic}

PROJECT GUIDELINES:
- Project Type: {guidelines.project_type}
- Timeline: {guidelines.timeline_weeks} weeks
- Total Target Word Count: {guidelines.target_word_count} words
- Citation Style: {guidelines.citation_style}

MANDATORY WORD COUNT MINIMUMS (per section):
{section_targets}
  TOTAL MINIMUM: {guidelines.target_word_count} words

⚠️  CRITICAL WORD COUNT RULE:
Every section MUST meet its minimum word count.
Do NOT write summaries or bullet points — write full academic prose.
If your draft is too short, expand with more detail, examples, and citations.

STRATEGIC SYNTHESIS:
Positioning: {strategic_synthesis.positioning_statement}

Novel Contributions:
{chr(10).join(f"  • {c.claim}" for c in strategic_synthesis.novel_contributions)}

Performance Targets: {strategic_synthesis.performance_targets}

Risks Identified:
{chr(10).join(f"  • {r}" for r in strategic_synthesis.risk_factors)}

DISCOVERED RESOURCES:
Datasets ({len(discovered_resources.datasets)}):
{chr(10).join(f"  • {d.name} — {d.source}" for d in discovered_resources.datasets[:5])}

Methods ({len(discovered_resources.methods)}):
{chr(10).join(f"  • {m.name}" for m in discovered_resources.methods[:6])}

Tools ({len(discovered_resources.tools)}):
{chr(10).join(f"  • {t.name}" for t in discovered_resources.tools[:5])}

Papers ({len(discovered_resources.papers)}):
{chr(10).join(f"  • {p.title[:80]}" for p in discovered_resources.papers[:5])}
"""
    return context


async def generate_specification(
    research_topic: str,
    guidelines: ProjectGuidelines,
    strategic_synthesis: StrategicSynthesis,
    discovered_resources: DiscoveredResources,
    feasibility_calibration=None,
    previous_feedback: str = None,
) -> ProjectSpecification:
    """
    Generate or revise a specification.

    Includes a post-generation word-count check: if the result is <70% of the
    target total, runs one expansion pass to flesh out short sections.
    """

    print("\n📝 GENERATING SPECIFICATION")
    print("-" * 80)

    agent_context = create_context_for_agents(
        research_topic=research_topic,
        guidelines=guidelines,
        discovered_resources=discovered_resources,
        strategic_synthesis=strategic_synthesis,
        feasibility_calibration=feasibility_calibration,
    )

    if previous_feedback:
        agent_context += f"\n\nPREVIOUS PROFESSOR FEEDBACK (incorporate all suggestions):\n{previous_feedback}"

    # ── Step 1: Orchestrator coordinates specialists ──────────────────────────
    print("   Coordinating specialist agents…")
    try:
        orchestrator_result = await Runner.run(
            starting_agent=specification_orchestrator,
            input=agent_context,
        )
        print("   ✅ Orchestration complete")
    except Exception as exc:
        print(f"   ❌ Orchestration failed: {exc}")
        raise

    # ── Step 2: Formatter structures output into ProjectSpecification ─────────
    print("   Formatting specification…")

    # Build per-section minimum table for the formatter
    section_mins = "\n".join(
        f"  • {s.section_name}: AT LEAST {s.word_count} words"
        for s in guidelines.sections
    )

    formatter_input = f"""
Research Topic (use EXACTLY as project_title, word for word): {research_topic}

Specialist Content:
{orchestrator_result.final_output}

MANDATORY WORD COUNT MINIMUMS:
{section_mins}
Total minimum: {guidelines.target_word_count} words

RULES:
1. project_title must be EXACTLY: {research_topic}
2. Every section.content must be full academic prose — NO bullet-point summaries.
3. word_count field must equal the ACTUAL word count of the content string.
4. If any section is below its minimum, EXPAND IT before returning.
5. total_word_count = sum of all section word_counts.

Format into a complete ProjectSpecification object with all fields populated.
"""

    try:
        formatter_result = await Runner.run(
            starting_agent=specification_formatter,
            input=formatter_input,
        )
        specification = formatter_result.final_output
        print(f"   ✅ Specification formatted — {specification.total_word_count} words")
    except Exception as exc:
        print(f"   ❌ Formatting failed: {exc}")
        raise

    # ── Step 3: Word count enforcement — expand if still too short ────────────
    target = guidelines.target_word_count
    if specification.total_word_count < int(target * 0.70):
        print(f"   ⚠️  Word count {specification.total_word_count} < 70% of {target} target — running expansion pass…")

        short_sections = []
        section_map = {
            "Abstract":                    ("abstract",               specification.abstract),
            "Justification and Overall Aim":("justification_and_aim", specification.justification_and_aim),
            "Objectives":                  ("objectives",              specification.objectives),
            "Review of Literature":        ("literature_review",       specification.literature_review),
            "Methodology":                 ("methodology",             specification.methodology),
            "Work Plan":                   ("work_plan",               specification.work_plan),
        }
        for req in guidelines.sections:
            key_field, section_obj = section_map.get(req.section_name, (None, None))
            if section_obj and section_obj.word_count < req.word_count:
                short_sections.append(
                    f"  • {req.section_name}: currently {section_obj.word_count} words, "
                    f"need at least {req.word_count} — current content:\n{section_obj.content[:500]}…"
                )

        expand_input = f"""
The specification is too short ({specification.total_word_count}/{target} words).
Expand these short sections with detailed academic content:

{chr(10).join(short_sections)}

Original context:
{orchestrator_result.final_output}

Return a COMPLETE ProjectSpecification with ALL sections at or above their minimums.
project_title MUST be EXACTLY: {research_topic}
"""
        try:
            expand_result = await Runner.run(
                starting_agent=specification_formatter,
                input=expand_input,
            )
            specification = expand_result.final_output
            print(f"   ✅ After expansion: {specification.total_word_count} words")
        except Exception as exc:
            print(f"   ⚠️  Expansion pass failed: {exc} — using original")

    return specification


# ── Context builder (kept for imports from phase5_workflow) ───────────────────

def create_context_for_agents_simple(
    research_topic: str,
    guidelines: ProjectGuidelines,
    discovered_resources: DiscoveredResources,
    strategic_synthesis: StrategicSynthesis,
    feasibility_calibration=None,
) -> str:
    """Alias — some modules import this name."""
    return create_context_for_agents(
        research_topic=research_topic,
        guidelines=guidelines,
        discovered_resources=discovered_resources,
        strategic_synthesis=strategic_synthesis,
        feasibility_calibration=feasibility_calibration,
    )