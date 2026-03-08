"""
Phase 3 Workflows — FULLY IMPLEMENTED

Previous state: every section was a comment ("# Call justification_specialist").
This file: every specialist is called individually with injected locked context.

Architecture:
  Each agent receives a carefully constructed prompt containing ONLY what it needs
  from the LockedRequirements object. No agent sees the full locked object — only
  its relevant slice. This keeps prompts focused and prevents agents from inventing
  facts not in their slice.

All sections feed into a sections dict that phase4_workflow assembles.
"""

from __future__ import annotations

import json
from typing import Union

from agents import Runner

from app.models.specification import ProjectSpecification, SpecificationSection
from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.locked_requirements import LockedRequirementsA, LockedRequirementsB

from app.core.agents.definitions.phase3_agents import (
    justification_specialist,
    objectives_architect,
    literature_strategist,
    methodology_designer,
    timeline_validator,
    references_compiler,
    abstract_specialist,
)

LockedRequirements = Union[LockedRequirementsA, LockedRequirementsB]


# ─── Context builders per agent ───────────────────────────────────────────────
# Each function builds a minimal, focused prompt for one specialist.
# Only the facts that agent needs — nothing more.


def _build_citation_pool_text(locked: LockedRequirements) -> str:
    """Serialize citation pool into readable text for agent prompts."""
    if not locked.citation_pool:
        return "No verified papers in citation pool."
    lines = []
    for i, p in enumerate(locked.citation_pool, 1):
        metric_info = ""
        if p.key_metric and p.key_metric_value:
            metric_info = f" | {p.key_metric}: {p.key_metric_value}"
        doi_info = f" | DOI: {p.doi}" if p.doi else " | No DOI"
        lines.append(
            f"{i}. {p.authors} ({p.year}) — {p.title}{metric_info}{doi_info}\n"
            f"   Harvard: {p.harvard_citation}\n"
            f"   Abstract: {p.abstract_snippet[:300]}..."
        )
    return "\n\n".join(lines)


def _build_similar_projects_text(locked: LockedRequirements) -> str:
    if not locked.similar_projects:
        return "No similar projects identified."
    lines = []
    for p in locked.similar_projects:
        lines.append(
            f"• Title: {p.title}\n"
            f"  Author/Institution: {p.author_or_institution} ({p.year or 'n.d.'})\n"
            f"  Level: {p.level}\n"
            f"  What they did: {p.approach_summary}\n"
            f"  Their limitation (the gap): {p.limitation}"
        )
    return "\n\n".join(lines)


def _justification_context(locked: LockedRequirements, guidelines: ProjectGuidelines) -> str:
    section_target = guidelines.sections[1].word_count if len(guidelines.sections) > 1 else 400

    if locked.track == "A":
        la: LockedRequirementsA = locked  # type: ignore
        baseline_text = (
            f"Baseline: {la.baseline.authors} ({la.baseline.year}) achieved "
            f"{la.baseline.metric_value} {la.baseline.metric_name} on the same dataset. "
            f"Target to beat: {la.baseline.target_to_beat}.\n"
            f"Harvard: {la.baseline.harvard_citation}"
        )
    else:
        baseline_text = "No quantitative baseline (theoretical project)."

    return f"""
TASK: Write the "Justification and Overall Aim" section.

RESEARCH TOPIC: {locked.research_topic}
FIELD OF STUDY: {locked.field_of_study}
ACADEMIC LEVEL: {locked.academic_level}
SECTION WORD TARGET: {section_target} words (write at minimum {int(section_target * 0.85)} words)
TRACK: {locked.track}

CITATION POOL (use ONLY these — no fabrication):
{_build_citation_pool_text(locked)}

SIMILAR PROJECTS (name and critique at least 2 of these):
{_build_similar_projects_text(locked)}

BASELINE:
{baseline_text}

MANDATORY CONTENT:
1. Open with real-world significance, citing ≥2 papers from the pool with their actual findings
2. Name and critique ≥2 specific similar projects by title — explain what THEY did not do
3. Explain what this project does differently to address those specific gaps
4. End with ONE clear, standalone aim sentence

PROHIBITED:
- "we" (use "I" or academic passive)
- "cutting-edge", "substantial improvements", "revolutionary"
- "reducing morbidity", "saving lives", "clinical deployment"
- Any citation not from the citation pool above
- Bullet points (use full prose paragraphs)
"""


def _objectives_context(locked: LockedRequirements, guidelines: ProjectGuidelines,
                         justification_content: str) -> str:
    section_target = guidelines.sections[2].word_count if len(guidelines.sections) > 2 else 300

    if locked.track == "A":
        la: LockedRequirementsA = locked  # type: ignore
        algorithms_text = "\n".join(f"  - {alg}" for alg in la.algorithms)
        dataset_text = f"{la.confirmed_dataset.name} ({la.confirmed_dataset.source})"
        baseline_text = f"{la.baseline.paper_title} ({la.baseline.year}): {la.baseline.metric_value}"
        xai_text = ", ".join(la.xai_techniques) if la.xai_techniques else "None"
    else:
        algorithms_text = "No algorithms (theoretical project)"
        dataset_text = "No dataset (theoretical project)"
        baseline_text = "No quantitative baseline"
        xai_text = "No XAI"

    return f"""
TASK: Write the "Objectives" section.

RESEARCH TOPIC: {locked.research_topic}
TRACK: {locked.track}
TIMELINE: {locked.timeline_weeks} weeks
SECTION WORD TARGET: {section_target} words (minimum {int(section_target * 0.85)} words)
ACADEMIC LEVEL: {locked.academic_level}

JUSTIFICATION SECTION (already written — objectives must align with this aim):
{justification_content[:600]}...

KEY FACTS TO INCORPORATE:
- Dataset: {dataset_text}
- Algorithms: {algorithms_text}
- XAI: {xai_text}
- Baseline: {baseline_text}

MANDATORY REQUIREMENTS:
1. Write a brief 2-sentence introduction then a NUMBERED LIST of 5 objectives
2. Each objective starts with "To [verb]..." and is 1-3 sentences
3. Objectives must be sequenced logically: acquisition → preprocessing → development → evaluation → documentation
4. ONE objective must address ethical considerations / responsible data use
5. ONE objective must reference a specific measurable target (the baseline)
6. Do NOT list methodology details here — that is a different section

PROHIBITED:
- Paragraph form for the objectives themselves (they must be numbered)
- Vague language: "improve significantly", "achieve good results"
- Any performance target not anchored to the named baseline
"""


def _literature_context(locked: LockedRequirements, guidelines: ProjectGuidelines) -> str:
    section_target = next(
        (s.word_count for s in guidelines.sections if "literature" in s.section_name.lower()),
        800
    )

    if locked.track == "A":
        la: LockedRequirementsA = locked  # type: ignore
        baseline_text = (
            f"Named baseline for positioning: {la.baseline.paper_title} ({la.baseline.year}), "
            f"{la.baseline.metric_value} {la.baseline.metric_name}. "
            f"This is the benchmark for comparison."
        )
    else:
        baseline_text = "No quantitative baseline — position around the theoretical debate."

    return f"""
TASK: Write the "Review of Literature" section.

RESEARCH TOPIC: {locked.research_topic}
TRACK: {locked.track}
SECTION WORD TARGET: {section_target} words (minimum {int(section_target * 0.85)} words)

CITATION POOL — use ONLY these papers (fabrication = hard failure):
{_build_citation_pool_text(locked)}

BASELINE FOR POSITIONING:
{baseline_text}

PAST PROJECTS (for gap identification — reference their limitations):
{_build_similar_projects_text(locked)}

MANDATORY REQUIREMENTS:
1. Every cited paper must include its ACTUAL performance figure or core finding
   BAD: "Smith et al. (2021) achieved high accuracy"
   GOOD: "Smith et al. (2021) achieved 91.2% AUC-ROC on the UCI dataset, though..."
2. Minimum 8 in-text citations from the pool
3. Must include a synthesis — compare papers against each other, not just describe them
4. Must identify a SPECIFIC gap (not "no study combined X and Y" — be precise about what combination)
5. Final paragraph must bridge from the gap to what this project will do
6. Include one comparison table if ≥5 papers are available (earns synthesis marks):
   | Study | Year | Method | Dataset | Key Metric | Limitation |

PROHIBITED:
- "Studies have shown", "Literature indicates" without a citation
- Citing any paper not in the citation pool
- Describing papers one by one without comparison
- Generic gap statements ("no study has been comprehensive enough")
"""


def _methodology_context(locked: LockedRequirements, guidelines: ProjectGuidelines) -> str:
    section_target = next(
        (s.word_count for s in guidelines.sections if "method" in s.section_name.lower()),
        900
    )

    if locked.track == "A":
        la: LockedRequirementsA = locked  # type: ignore
        algo_justifications = "\n".join(
            f"  - {alg}: {la.algorithm_justifications.get(alg, 'standard choice for this problem type')}"
            for alg in la.algorithms
        )
        return f"""
TASK: Write the "Methodology" section.

RESEARCH TOPIC: {locked.research_topic}
TRACK: A (empirical/data)
SECTION WORD TARGET: {section_target} words (minimum {int(section_target * 0.85)} words)
CITATION STYLE: {locked.citation_style}

══ LOCKED FACTS — use exactly as stated, no deviation ══

DATASET:
  Name: {la.confirmed_dataset.name}
  Source: {la.confirmed_dataset.source}
  URL: {la.confirmed_dataset.access_url or 'see institution library'}
  Description: {la.confirmed_dataset.description}
  Size: {la.confirmed_dataset.size or 'see source'}
  Public: {'Yes' if la.confirmed_dataset.is_public else 'No'}
  Citation: {la.confirmed_dataset.harvard_citation}
{('\nVERIFIED DATASET PROFILE (from uploaded file — use these EXACT figures):\n' + la.confirmed_dataset.full_profile_text) if la.confirmed_dataset.profiled and la.confirmed_dataset.full_profile_text else ''}

BASELINE:
  Paper: {la.baseline.paper_title}
  Authors: {la.baseline.authors}
  Year: {la.baseline.year}
  Their result: {la.baseline.metric_value} {la.baseline.metric_name}
  Target: {la.baseline.target_to_beat}
  Citation: {la.baseline.harvard_citation}

EVALUATION:
  Primary metric: {la.evaluation.primary_metric}
  Additional metrics: {', '.join(la.evaluation.additional_metrics)}
  Split: {la.evaluation.train_val_test_split}
  Validation strategy: {la.evaluation.validation_strategy}
  Imbalance strategy: {la.evaluation.imbalance_strategy or 'Not specified — describe appropriately'}

ALGORITHMS (with justifications):
{algo_justifications}

XAI TECHNIQUES:
{', '.join(la.xai_techniques) if la.xai_techniques else 'Not applicable'}

ETHICS STATEMENT (DROP THIS IN — do not rewrite or summarise):
{la.ethics.statement}
Population bias note: {la.ethics.population_bias_note or 'Acknowledge demographic limitations of dataset'}

CITATION POOL for method citations:
{_build_citation_pool_text(locked)}

══ MANDATORY CHECKLIST — ALL 8 MUST APPEAR ══
1. Named dataset with source URL and citation ← use locked dataset above
2. Explicit train/validation/test split ← use locked evaluation.train_val_test_split
3. Evaluation metrics beyond accuracy ← use locked evaluation
4. Named baseline with figure ← use locked baseline
5. Class imbalance strategy ← use locked evaluation.imbalance_strategy
6. Algorithm justifications ← use locked algo_justifications
7. XAI technique named and justified ← use locked xai_techniques
8. Ethics statement ← DROP IN the locked ethics statement verbatim

The validation layer will check every one of these. Missing any = hard failure.

STRUCTURE:
  1. Data Source and Collection
  2. Data Preprocessing
  3. Model Development (algorithms + XAI)
  4. Evaluation Framework
  5. Practical Limitations
  6. Ethical Considerations ← Item 8 goes here

No bullet points in final output — academic prose with subsection headers.
"""
    else:
        lb: LockedRequirementsB = locked  # type: ignore
        return f"""
TASK: Write the "Methodology" section.

RESEARCH TOPIC: {locked.research_topic}
TRACK: B (theoretical/humanities)
SECTION WORD TARGET: {section_target} words (minimum {int(section_target * 0.85)} words)

══ LOCKED FACTS ══

THEORETICAL FRAMEWORK: {lb.theoretical_framework}
JUSTIFICATION: {lb.framework_justification}

CENTRAL ARGUMENT: {lb.central_argument}

PRIMARY SOURCE FOCUS: {lb.primary_source_focus or 'Not specified — describe broadly'}

KEY SCHOLARLY DEBATES TO ENGAGE:
{chr(10).join(f'  - {d}' for d in lb.scholarly_debates)}

POSITIONALITY: {lb.positionality_statement or 'Discuss researcher standpoint and its implications'}

CITATION POOL:
{_build_citation_pool_text(locked)}

MANDATORY CHECKLIST (5 items):
1. Theoretical framework named and cited
2. Analytical methodology named (close reading, thematic analysis, discourse analysis, etc.)
3. Primary vs secondary sources distinguished
4. Positionality statement present
5. Ethics for humanities context (sensitive materials, marginalised voices, archival access)

PROHIBITED:
- Any ML/algorithm/dataset language (this is a humanities spec)
- Quantitative evaluation metrics
- Training/testing/accuracy language
"""


def _timeline_context(locked: LockedRequirements, guidelines: ProjectGuidelines,
                       objectives_content: str) -> str:
    section_target = next(
        (s.word_count for s in guidelines.sections if "work" in s.section_name.lower() or "plan" in s.section_name.lower()),
        200
    )
    plan_text = json.dumps(locked.work_plan_weeks, indent=2)

    return f"""
TASK: Write the "Work Plan" section.

RESEARCH TOPIC: {locked.research_topic}
TRACK: {locked.track}
TOTAL WEEKS AVAILABLE: {locked.timeline_weeks}
SECTION WORD TARGET: {section_target} words (minimum {int(section_target * 0.85)} words)

PRE-BUILT WEEK STRUCTURE (use this exactly):
{plan_text}

OBJECTIVES (align the plan to these):
{objectives_content[:500]}...

MANDATORY REQUIREMENTS:
1. Use ONLY "weeks" — never "months" (validation layer will fail the spec if months appear)
2. Include an intro paragraph describing the overall structure
3. Present the plan as a table with columns: Weeks | Activity | Deliverable
4. Cover ALL {locked.timeline_weeks} weeks — no gaps
5. First phase must be "Literature review and baseline identification"
6. Last phase must be "Write-up, final review, and submission"
7. Include a risk/contingency paragraph after the table
8. Include a paragraph aligning weeks to objectives

PROHIBITED:
- Any reference to months or month-based timelines
- Activities with no deliverable
- Phases that are purely sequential with no note of overlap where realistic
"""


def _references_context(locked: LockedRequirements,
                          all_section_text: str) -> str:
    return f"""
TASK: Compile the complete references list.

CITATION STYLE: {locked.citation_style} (Cite Them Right)

CITATION POOL (these are your source of truth):
{_build_citation_pool_text(locked)}

ALL SECTION TEXT (scan for in-text citations to cross-check):
{all_section_text[:4000]}...

MANDATORY REQUIREMENTS:
1. Include ONLY papers from the citation pool — no new additions
2. Use the pre-formatted harvard_citation field from each paper directly
3. Sort alphabetically by first author surname
4. Every (Author, Year) found in section text must have a matching entry here
5. Datasets need full citation including access date

FORMAT:
One entry per line. No numbering. No bullets. Just formatted citations.
Check each entry has: Authors (Year) 'Title', Venue, pages, doi.
"""


def _abstract_context(locked: LockedRequirements, guidelines: ProjectGuidelines,
                        all_sections: dict) -> str:
    section_target = guidelines.sections[0].word_count if guidelines.sections else 300

    if locked.track == "A":
        la: LockedRequirementsA = locked  # type: ignore
        baseline_info = (
            f"Baseline: {la.baseline.metric_value} {la.baseline.metric_name} by "
            f"{la.baseline.authors} ({la.baseline.year}). Target: {la.baseline.target_to_beat}"
        )
        xai_info = f"XAI: {', '.join(la.xai_techniques)}" if la.xai_techniques else ""
    else:
        baseline_info = "Theoretical project — no quantitative baseline"
        xai_info = ""

    return f"""
TASK: Write the "Abstract" section.
This is the LAST section to write — you now have all other sections to draw from.

WORD TARGET: EXACTLY {section_target} words (±15 words acceptable)
RESEARCH TOPIC: {locked.research_topic}
TRACK: {locked.track}

LOCKED FACTS TO INCLUDE:
{baseline_info}
{xai_info}
Dataset: {locked.confirmed_dataset.name if locked.track == 'A' else 'theoretical sources'}

COMPLETED SECTIONS (draw from these — do not invent new content):
JUSTIFICATION (first 300 chars): {all_sections.get('justification', '')[:300]}...
OBJECTIVES (first 300 chars): {all_sections.get('objectives', '')[:300]}...
METHODOLOGY (first 300 chars): {all_sections.get('methodology', '')[:300]}...

MANDATORY STRUCTURE (4 elements):
1. The research problem and why it matters (1-2 sentences)
2. The specific gap in existing knowledge this project fills (1 sentence, specific)
3. What this project will do — methods, techniques, named specifically (2-3 sentences)
4. What the project expects to FIND or CONTRIBUTE — not just what it will DO (1-2 sentences)
   For Track A: include target metric with baseline reference
   For Track B: state the argument and its contribution to the scholarly debate

PROHIBITED:
- "cutting-edge techniques", "substantial improvements"
- "reducing morbidity/mortality" (clinical overreach)
- Performance targets with no named baseline
- Saying what the project will do without saying what it expects to find
- Citing specific papers in an abstract
- Going over {section_target + 15} words or under {section_target - 15} words
"""


# ─── Main workflow function ────────────────────────────────────────────────────

async def generate_specification_sections(
    research_topic: str,
    guidelines: ProjectGuidelines,
    synthesis: StrategicSynthesis,
    locked: LockedRequirements,
) -> dict:
    """
    Generate all specification sections using individual specialist agents.
    Each specialist receives a focused locked-context prompt.
    Returns dict of section_name → content string.
    """

    print("\n📝 GENERATING SPECIFICATION SECTIONS (individual specialists)")
    print("-" * 80)

    sections: dict = {}

    # ── 1. Justification & Aim ────────────────────────────────────────────────
    print("   [1/7] Justification & Aim...")
    try:
        result = await Runner.run(
            starting_agent=justification_specialist,
            input=_justification_context(locked, guidelines),
        )
        sections["justification"] = str(result.final_output)
        wc = len(sections["justification"].split())
        print(f"   ✅ Justification: {wc} words")
    except Exception as exc:
        print(f"   ❌ Justification failed: {exc}")
        raise

    # ── 2. Objectives ─────────────────────────────────────────────────────────
    print("   [2/7] Objectives...")
    try:
        result = await Runner.run(
            starting_agent=objectives_architect,
            input=_objectives_context(locked, guidelines, sections["justification"]),
        )
        sections["objectives"] = str(result.final_output)
        wc = len(sections["objectives"].split())
        print(f"   ✅ Objectives: {wc} words")
    except Exception as exc:
        print(f"   ❌ Objectives failed: {exc}")
        raise

    # ── 3. Literature Review ──────────────────────────────────────────────────
    print("   [3/7] Literature Review...")
    try:
        result = await Runner.run(
            starting_agent=literature_strategist,
            input=_literature_context(locked, guidelines),
        )
        sections["literature_review"] = str(result.final_output)
        wc = len(sections["literature_review"].split())
        print(f"   ✅ Literature Review: {wc} words")
    except Exception as exc:
        print(f"   ❌ Literature Review failed: {exc}")
        raise

    # ── 4. Methodology ────────────────────────────────────────────────────────
    print("   [4/7] Methodology...")
    try:
        result = await Runner.run(
            starting_agent=methodology_designer,
            input=_methodology_context(locked, guidelines),
        )
        sections["methodology"] = str(result.final_output)
        wc = len(sections["methodology"].split())
        print(f"   ✅ Methodology: {wc} words")
    except Exception as exc:
        print(f"   ❌ Methodology failed: {exc}")
        raise

    # ── 5. Work Plan ──────────────────────────────────────────────────────────
    print("   [5/7] Work Plan...")
    try:
        result = await Runner.run(
            starting_agent=timeline_validator,
            input=_timeline_context(locked, guidelines, sections["objectives"]),
        )
        sections["work_plan"] = str(result.final_output)
        wc = len(sections["work_plan"].split())
        print(f"   ✅ Work Plan: {wc} words")
    except Exception as exc:
        print(f"   ❌ Work Plan failed: {exc}")
        raise

    # ── 6. References ─────────────────────────────────────────────────────────
    print("   [6/7] References...")
    all_section_text = "\n\n".join(sections.values())
    try:
        result = await Runner.run(
            starting_agent=references_compiler,
            input=_references_context(locked, all_section_text),
        )
        sections["references"] = str(result.final_output)
        ref_count = len([l for l in sections["references"].split("\n") if l.strip()])
        print(f"   ✅ References: {ref_count} entries")
    except Exception as exc:
        print(f"   ❌ References failed: {exc}")
        raise

    # ── 7. Abstract (must be last) ────────────────────────────────────────────
    print("   [7/7] Abstract (last)...")
    try:
        result = await Runner.run(
            starting_agent=abstract_specialist,
            input=_abstract_context(locked, guidelines, sections),
        )
        sections["abstract"] = str(result.final_output)
        wc = len(sections["abstract"].split())
        print(f"   ✅ Abstract: {wc} words")
    except Exception as exc:
        print(f"   ❌ Abstract failed: {exc}")
        raise

    total = sum(len(v.split()) for k, v in sections.items() if k != "references")
    print(f"\n✅ All sections generated — total: {total} words")

    return sections
