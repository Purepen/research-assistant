"""
Phase 4 Workflows — UPDATED v3

Model Tier Addition (Apr 2026):
  generate_specification() and _format_sections_into_spec() now accept an
  optional agent_model_config parameter (AgentModelConfig).

  When present:
    - A tier-aware specification_formatter agent is built by cloning the module
      singleton with the model string from agent_model_config
    - A tier-aware specification_orchestrator is built the same way (legacy path)
    - Both the main formatter call and the expansion pass use the tier-aware agent
    - generate_specification_sections() receives agent_model_config (phase3 uses it)

  When None: all existing behaviour is unchanged — module-level singletons are used.

Original key change (v2) preserved:
  When a LockedRequirements object is present (new flow), generation is routed
  through the 7 individual phase3 section agents (generate_specification_sections)
  rather than the monolithic orchestrator.
  Legacy path (no locked object): orchestrator → formatter (unchanged)
  New path    (locked object):    7 specialists → formatter
"""

from __future__ import annotations

from typing import Optional, Union
from agents import Runner, Agent

from app.models.specification import ProjectSpecification
from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.resources import DiscoveredResources
from app.core.agents.definitions.phase4_agents import (
    specification_orchestrator,
    specification_formatter,
)

try:
    from app.models.locked_requirements import LockedRequirementsA, LockedRequirementsB
    from app.core.pipelines.phase3_workflow import generate_specification_sections
    _LOCKED_AVAILABLE = True
except ImportError:
    _LOCKED_AVAILABLE = False

LockedRequirements = Union["LockedRequirementsA", "LockedRequirementsB", None]


# ─── Helper: resolve tier-aware agents ───────────────────────────────────────

def _get_formatter_agent(agent_model_config=None):
    """
    Return a tier-aware formatter agent when agent_model_config is set,
    otherwise return the module-level singleton.
    Clones name, instructions, output_type from the singleton — only model changes.
    """
    if agent_model_config is None:
        return specification_formatter
    try:
        from app.models.agent_config import AgentKey
        model = agent_model_config.get(AgentKey.SPECIFICATION_FORMATTER)
        if not model or model == specification_formatter.model:
            return specification_formatter
        return Agent(
            name=specification_formatter.name,
            instructions=specification_formatter.instructions,
            model=model,
            output_type=specification_formatter.output_type,
        )
    except Exception as exc:
        print(f"   ⚠️  Could not build tier-aware formatter ({exc}) — using default")
        return specification_formatter


def _get_orchestrator_agent(agent_model_config=None):
    """
    Return a tier-aware orchestrator agent when agent_model_config is set,
    otherwise return the module-level singleton.
    """
    if agent_model_config is None:
        return specification_orchestrator
    try:
        from app.models.agent_config import AgentKey
        model = agent_model_config.get(AgentKey.SPECIFICATION_ORCHESTRATOR)
        if not model or model == specification_orchestrator.model:
            return specification_orchestrator
        return Agent(
            name=specification_orchestrator.name,
            instructions=specification_orchestrator.instructions,
            model=model,
            output_type=getattr(specification_orchestrator, "output_type", None),
        )
    except Exception as exc:
        print(f"   ⚠️  Could not build tier-aware orchestrator ({exc}) — using default")
        return specification_orchestrator


# ─── Context builder (legacy path) — UNCHANGED ────────────────────────────────

def create_context_for_agents(
    research_topic: str,
    guidelines: ProjectGuidelines,
    discovered_resources: DiscoveredResources,
    strategic_synthesis: StrategicSynthesis,
    feasibility_calibration=None,
) -> str:
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


# ─── Formatter helper — UPDATED (tier-aware) ─────────────────────────────────

async def _format_sections_into_spec(
    research_topic: str,
    sections: dict,
    guidelines: ProjectGuidelines,
    agent_model_config=None,   # NEW
) -> ProjectSpecification:
    """
    Takes the raw section text dict from phase3 specialists and formats it into
    a structured ProjectSpecification via the formatter agent.

    agent_model_config: when present, uses a tier-aware formatter.
    """
    section_mins = "\n".join(
        f"  • {s.section_name}: AT LEAST {s.word_count} words"
        for s in guidelines.sections
    )

    sections_text = f"""
ABSTRACT:
{sections.get('abstract', '')}

JUSTIFICATION AND AIM:
{sections.get('justification', '')}

OBJECTIVES:
{sections.get('objectives', '')}

REVIEW OF LITERATURE:
{sections.get('literature_review', '')}

METHODOLOGY:
{sections.get('methodology', '')}

WORK PLAN:
{sections.get('work_plan', '')}

REFERENCES (one per line):
{sections.get('references', '')}
"""

    formatter_input = f"""
Research Topic (use EXACTLY as project_title): {research_topic}

Specialist Content:
{sections_text}

MANDATORY WORD COUNT MINIMUMS:
{section_mins}
Total minimum: {guidelines.target_word_count} words

RULES:
1. project_title must be EXACTLY: {research_topic}
2. Every section.content must contain the full text from Specialist Content above.
   Do NOT summarise or shorten — copy the section content verbatim.
3. word_count field = actual word count of the content.
4. references = list of strings, one per citation entry.
5. total_word_count = sum of all section word_counts.
6. If any section is below its minimum — expand it, do not truncate.

Format into a complete ProjectSpecification object with all fields populated.
"""

    active_formatter = _get_formatter_agent(agent_model_config)

    result = await Runner.run(
        starting_agent=active_formatter,
        input=formatter_input,
    )
    return result.final_output


# ─── Main generation function — UPDATED ───────────────────────────────────────

async def generate_specification(
    research_topic: str,
    guidelines: ProjectGuidelines,
    strategic_synthesis: StrategicSynthesis,
    discovered_resources: DiscoveredResources,
    feasibility_calibration=None,
    previous_feedback: Optional[str] = None,
    locked: LockedRequirements = None,
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
) -> ProjectSpecification:
    """
    Generate or revise a specification.

    New path  (locked is not None): calls 7 individual phase3 specialists,
                                     then formats via formatter.
    Legacy path (locked is None):   calls orchestrator then formatter (unchanged).

    In both paths, if total word count < 70% of target, an expansion pass runs.

    agent_model_config: when present, tier-aware agents are used for the formatter,
      orchestrator (legacy path), and the phase3 specialists (via generate_specification_sections).
    """

    print("\n📝 GENERATING SPECIFICATION")
    print(f"   Path: {'locked-context specialists' if locked else 'legacy orchestrator'}")
    print("-" * 80)

    specification: Optional[ProjectSpecification] = None

    # ── NEW PATH: Individual specialists with locked context ──────────────────
    if locked is not None and _LOCKED_AVAILABLE:
        try:
            sections = await generate_specification_sections(
                research_topic=research_topic,
                guidelines=guidelines,
                synthesis=strategic_synthesis,
                locked=locked,
                agent_model_config=agent_model_config,   # NEW — passes tier to phase3
            )

            if previous_feedback:
                for key in sections:
                    if sections[key]:
                        sections[key] = sections[key] + (
                            f"\n\n[REVISION NOTE: {previous_feedback[:500]}]"
                        )

            specification = await _format_sections_into_spec(
                research_topic=research_topic,
                sections=sections,
                guidelines=guidelines,
                agent_model_config=agent_model_config,   # NEW
            )
            print(f"   ✅ Specialists path complete: {specification.total_word_count} words")

        except Exception as exc:
            print(f"   ❌ Specialists path FAILED: {exc}")
            raise

    # ── LEGACY PATH: Orchestrator → Formatter ────────────────────────────────
    if specification is None:
        agent_context = create_context_for_agents(
            research_topic=research_topic,
            guidelines=guidelines,
            discovered_resources=discovered_resources,
            strategic_synthesis=strategic_synthesis,
            feasibility_calibration=feasibility_calibration,
        )
        if previous_feedback:
            agent_context += f"\n\nPREVIOUS PROFESSOR FEEDBACK:\n{previous_feedback}"

        print("   Coordinating legacy orchestrator…")
        active_orchestrator = _get_orchestrator_agent(agent_model_config)   # NEW
        orchestrator_result = await Runner.run(
            starting_agent=active_orchestrator,
            input=agent_context,
        )
        print("   ✅ Orchestration complete")

        section_mins = "\n".join(
            f"  • {s.section_name}: AT LEAST {s.word_count} words"
            for s in guidelines.sections
        )
        formatter_input = f"""
Research Topic (use EXACTLY as project_title): {research_topic}

Specialist Content:
{orchestrator_result.final_output}

MANDATORY WORD COUNT MINIMUMS:
{section_mins}
Total minimum: {guidelines.target_word_count} words

RULES:
1. project_title = EXACTLY: {research_topic}
2. Every section.content must contain the full text from Specialist Content above.
   Do NOT summarise or shorten — copy the section content verbatim.
3. word_count field = actual word count of the content.
4. references = list of strings, one per citation entry.
5. total_word_count = sum of all section word_counts.
6. If any section is below its minimum — expand it, do not truncate.

Format into a complete ProjectSpecification object with all fields populated.
"""
        active_formatter = _get_formatter_agent(agent_model_config)   # NEW
        formatter_result = await Runner.run(
            starting_agent=active_formatter,
            input=formatter_input,
        )
        specification = formatter_result.final_output
        print(f"   ✅ Legacy path complete: {specification.total_word_count} words")

    # ── Word count expansion pass — UPDATED (tier-aware formatter) ────────────
    target = guidelines.target_word_count or 3000
    if specification.total_word_count < target * 0.70:
        print(f"   ⚠️  {specification.total_word_count} words < 70% of {target} — running expansion")

        short_sections = []
        for s in guidelines.sections:
            sec = getattr(specification, _section_attr(s.section_name), None)
            if sec and sec.word_count < int(s.word_count * 0.80):
                short_sections.append(
                    f"• {s.section_name}: currently {sec.word_count} words, "
                    f"need {s.word_count} words minimum\n  Content:\n{sec.content[:400]}..."
                )

        if short_sections:
            expand_input = f"""
Expand these short sections with detailed academic content:

{chr(10).join(short_sections)}

All context about the research topic and locked requirements remains the same.
Return a COMPLETE ProjectSpecification with ALL sections at or above their minimums.
project_title MUST be EXACTLY: {research_topic}

Every section.content = full academic prose, NO bullet-point summaries.
3. word_count = ACTUAL word count of content string.
4. Expand any short section before returning.
5. total_word_count = sum of all section word_counts.
"""
            try:
                active_formatter = _get_formatter_agent(agent_model_config)   # NEW
                expand_result = await Runner.run(
                    starting_agent=active_formatter,
                    input=expand_input,
                )
                specification = expand_result.final_output
                print(f"   ✅ After expansion: {specification.total_word_count} words")
            except Exception as exc:
                print(f"   ⚠️  Expansion failed: {exc} — using original")

    return specification


def _section_attr(section_name: str) -> str:
    """Map section name to ProjectSpecification attribute name."""
    mapping = {
        "Abstract":                      "abstract",
        "Justification and Aim":         "justification_and_aim",
        "Justification and Overall Aim": "justification_and_aim",
        "Objectives":                    "objectives",
        "Review of Literature":          "literature_review",
        "Literature Review":             "literature_review",
        "Methodology":                   "methodology",
        "Work Plan":                     "work_plan",
    }
    return mapping.get(section_name, section_name.lower().replace(" ", "_"))


# ── Alias for imports — UNCHANGED ─────────────────────────────────────────────
def create_context_for_agents_simple(*args, **kwargs) -> str:
    return create_context_for_agents(*args, **kwargs)