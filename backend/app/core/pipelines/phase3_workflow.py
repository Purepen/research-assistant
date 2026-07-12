"""
Phase 3 Workflows — FULLY IMPLEMENTED (Paradigm Edition)

Changes from previous version:
  1. All la.baseline.* reads are null-guarded — baseline is None for non-ML paradigms
     and optionally None for ML when citation pool has no metric-bearing papers.
     Previously all five context builders crashed on NoneType attribute access.

  2. _methodology_context() now passes PARADIGM to the agent so it can route to
     the correct template block (ML / Econometric / Survey / Systems / Finance).

  3. All other logic is unchanged — same agent calls, same section order, same
     prompt structure for ML_CLASSIFICATION (the default and most common path).

Model Tier Addition (Apr 2026):
  generate_specification_sections() now accepts an optional agent_model_config
  parameter. When present, tier-aware agents are built via build_phase3_agents()
  and used in place of the module-level singletons. When None, all existing
  behaviour is unchanged.
"""

from __future__ import annotations

import json
from typing import Union

from agents import Runner

from app.models.guidelines import ProjectGuidelines
from app.models.synthesis import StrategicSynthesis
from app.models.locked_requirements import (
    LockedRequirementsA,
    LockedRequirementsB,
    ResearchParadigm,
)

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


# ─── Helpers — UNCHANGED ──────────────────────────────────────────────────────

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


def _safe_baseline_text_for_justification(la: LockedRequirementsA) -> str:
    """
    BUG FIX: previously read la.baseline.authors etc. directly — crashes when None.
    Non-ML paradigms always have baseline=None. ML paradigm may also have None
    when the citation pool contained no metric-bearing papers.
    """
    if la.baseline is None:
        paradigm_val = la.paradigm.value if hasattr(la, 'paradigm') else 'ml_classification'
        if paradigm_val == ResearchParadigm.ML_CLASSIFICATION.value:
            return (
                "No quantitative baseline found in citation pool. "
                "The student should confirm a specific benchmark with their supervisor "
                "from the reviewed literature before submission."
            )
        else:
            return (
                f"No ML-style baseline applies for this {paradigm_val} project. "
                "The justification should position this work against the existing literature "
                "by identifying a specific gap rather than a performance benchmark."
            )
    return (
        f"Baseline: {la.baseline.authors} ({la.baseline.year}) achieved "
        f"{la.baseline.metric_value} {la.baseline.metric_name} on the same dataset. "
        f"Target to beat: {la.baseline.target_to_beat}.\n"
        f"Harvard: {la.baseline.harvard_citation}"
    )


def _safe_baseline_text_short(la: LockedRequirementsA) -> str:
    """
    BUG FIX: short form used in objectives and literature contexts.
    Returns a safe string regardless of whether baseline is None.
    """
    if la.baseline is None:
        return "No named baseline — student to confirm with supervisor from literature"
    return f"{la.baseline.paper_title} ({la.baseline.year}): {la.baseline.metric_value}"


def _safe_baseline_text_for_literature(la: LockedRequirementsA) -> str:
    """
    BUG FIX: used in literature review context.
    """
    if la.baseline is None:
        paradigm_val = la.paradigm.value if hasattr(la, 'paradigm') else 'ml_classification'
        if paradigm_val == ResearchParadigm.ML_CLASSIFICATION.value:
            return (
                "No named baseline confirmed yet. "
                "Position the review around the best-performing methods in the pool "
                "and identify the performance gap this project will target."
            )
        else:
            return (
                "No quantitative performance baseline applies. "
                "Position the review around the key theoretical debates, methodological gaps, "
                "or empirical findings in the citation pool relevant to this research question."
            )
    return (
        f"Named baseline for positioning: {la.baseline.paper_title} ({la.baseline.year}), "
        f"{la.baseline.metric_value} {la.baseline.metric_name}. "
        f"This is the benchmark for comparison."
    )


def _safe_baseline_text_for_abstract(la: LockedRequirementsA) -> str:
    """
    BUG FIX: used in abstract context.
    """
    if la.baseline is None:
        paradigm_val = la.paradigm.value if hasattr(la, 'paradigm') else 'ml_classification'
        if paradigm_val == ResearchParadigm.ML_CLASSIFICATION.value:
            return (
                "No specific baseline confirmed — "
                "describe the expected contribution without a named performance figure."
            )
        else:
            return (
                f"No ML-style baseline — this is a {paradigm_val} project. "
                "State the expected contribution in terms appropriate to this paradigm "
                "(e.g. causal relationship established, survey constructs validated, system deployed)."
            )
    return (
        f"Baseline: {la.baseline.metric_value} {la.baseline.metric_name} by "
        f"{la.baseline.authors} ({la.baseline.year}). Target: {la.baseline.target_to_beat}"
    )


def _safe_baseline_block_for_methodology(la: LockedRequirementsA) -> str:
    """
    BUG FIX: full baseline block used in methodology context.
    Returns a complete formatted block whether baseline exists or not.
    """
    if la.baseline is None:
        paradigm_val = la.paradigm.value if hasattr(la, 'paradigm') else 'ml_classification'
        if paradigm_val == ResearchParadigm.ML_CLASSIFICATION.value:
            return (
                "BASELINE:\n"
                "  No named baseline confirmed in citation pool.\n"
                "  Instruct student: 'A specific benchmark paper and performance figure\n"
                "  will be confirmed with the supervisor prior to model training.\n"
                "  The target is to improve upon the best result identified in the literature review.'"
            )
        else:
            return (
                f"BASELINE:\n"
                f"  Not applicable for {paradigm_val} paradigm.\n"
                f"  Do not reference AUC-ROC, accuracy figures, or ML benchmarks.\n"
                f"  The evaluation criteria for this paradigm are defined in the EVALUATION block below."
            )
    return (
        f"BASELINE:\n"
        f"  Paper: {la.baseline.paper_title}\n"
        f"  Authors: {la.baseline.authors}\n"
        f"  Year: {la.baseline.year}\n"
        f"  Their result: {la.baseline.metric_value} {la.baseline.metric_name}\n"
        f"  Target: {la.baseline.target_to_beat}\n"
        f"  Citation: {la.baseline.harvard_citation}"
    )


# ─── Context builders — UNCHANGED ─────────────────────────────────────────────

def _justification_context(locked: LockedRequirements, guidelines: ProjectGuidelines) -> str:
    section_target = guidelines.sections[1].word_count if len(guidelines.sections) > 1 else 400

    if locked.track == "A":
        la: LockedRequirementsA = locked  # type: ignore
        baseline_text = _safe_baseline_text_for_justification(la)
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
        baseline_text = _safe_baseline_text_short(la)
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
- Algorithms / Methods: {algorithms_text}
- XAI: {xai_text}
- Baseline: {baseline_text}

MANDATORY REQUIREMENTS:
1. Write a brief 2-sentence introduction then a NUMBERED LIST of 5 objectives
2. Each objective starts with "To [verb]..." and is 1-3 sentences
3. Objectives must be sequenced logically: acquisition → preprocessing → development → evaluation → documentation
4. ONE objective must address ethical considerations / responsible data use
5. ONE objective must reference a specific measurable target (the baseline, or equivalent for non-ML paradigms)
6. Do NOT list methodology details here — that is a different section

PROHIBITED:
- Paragraph form for the objectives themselves (they must be numbered)
- Vague language: "improve significantly", "achieve good results"
- Any performance target not anchored to the named baseline (or paradigm-appropriate criterion)
"""


def _literature_context(locked: LockedRequirements, guidelines: ProjectGuidelines) -> str:
    section_target = next(
        (s.word_count for s in guidelines.sections if "literature" in s.section_name.lower()),
        800
    )

    if locked.track == "A":
        la: LockedRequirementsA = locked  # type: ignore
        baseline_text = _safe_baseline_text_for_literature(la)
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
   For non-ML papers: cite the key empirical finding, coefficient, or theoretical contribution
2. Minimum 8 in-text citations from the pool
3. Must include a synthesis — compare papers against each other, not just describe them
4. Must identify a SPECIFIC gap (not "no study combined X and Y" — be precise)
5. Final paragraph must bridge from the gap to what this project will do
6. Include one comparison table if ≥5 papers are available (earns synthesis marks):
   | Study | Year | Method | Dataset | Key Finding | Limitation |

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

        paradigm_val = la.paradigm.value if hasattr(la, 'paradigm') else ResearchParadigm.ML_CLASSIFICATION.value

        algo_justifications = "\n".join(
            f"  - {alg}: {la.algorithm_justifications.get(alg, 'standard choice for this problem type')}"
            for alg in la.algorithms
        )

        baseline_block = _safe_baseline_block_for_methodology(la)

        paradigm_extras = ""
        if paradigm_val == ResearchParadigm.ECONOMETRIC_CAUSAL.value:
            paradigm_extras = f"""
CAUSAL INFERENCE CONTEXT:
  Treatment variable: {la.treatment_variable or 'To be specified by student with supervisor'}
  Outcome variable:   {la.outcome_variable or 'To be specified by student with supervisor'}
  Identification strategy: {la.causal_identification_strategy or 'OLS baseline + robustness checks'}
  Statistical software: {la.statistical_software or 'R or Stata (student to confirm)'}
  Data structure: {la.data_structure or 'cross-sectional (confirm with supervisor)'}
  Control variables: {', '.join(la.control_variables) if la.control_variables else 'To be identified from literature'}
"""
        elif paradigm_val == ResearchParadigm.SURVEY_QUANTITATIVE.value:
            paradigm_extras = f"""
SURVEY INSTRUMENT CONTEXT:
  Measurement instrument: {la.measurement_instrument or '5-point Likert scale'}
  Reliability test: {la.reliability_test or "Cronbach's Alpha (target: α > 0.7)"}
  Sample size target: {la.sample_size_target or 'minimum 100 respondents (G*Power)'}
"""
        elif paradigm_val == ResearchParadigm.SYSTEMS_ENGINEERING.value:
            paradigm_extras = f"""
SYSTEMS CONTEXT:
  System type: {la.system_type or 'software system'}
  Evaluation environment: {la.evaluation_environment or 'standard development environment'}
"""

        return f"""
TASK: Write the "Methodology" section.

RESEARCH TOPIC: {locked.research_topic}
TRACK: A (empirical/data)
PARADIGM: {paradigm_val}
SECTION WORD TARGET: {section_target} words (minimum {int(section_target * 0.85)} words)
CITATION STYLE: {locked.citation_style}

READ THE PARADIGM FIELD ABOVE BEFORE WRITING.
It tells you which template and checklist to use from your instructions.
Do not use ML metrics (AUC-ROC, F1, SMOTE, train/test split) for non-ML paradigms.
Do not use econometric language (OLS, coefficient, p-value) in ML paradigms.

══ LOCKED FACTS — use exactly as stated, no deviation ══

DATASET:
  Name: {la.confirmed_dataset.name}
  Source: {la.confirmed_dataset.source}
  URL: {la.confirmed_dataset.access_url or 'see institution library'}
  Description: {la.confirmed_dataset.description}
  Size: {la.confirmed_dataset.size or 'see source'}
  Public: {'Yes' if la.confirmed_dataset.is_public else 'No'}
  Citation: {la.confirmed_dataset.harvard_citation}
{(chr(10) + 'VERIFIED DATASET PROFILE (from uploaded file — use these EXACT figures):' + chr(10) + la.confirmed_dataset.full_profile_text) if la.confirmed_dataset.profiled and la.confirmed_dataset.full_profile_text else ''}

{baseline_block}

EVALUATION:
  Primary metric: {la.evaluation.primary_metric}
  Additional metrics: {', '.join(la.evaluation.additional_metrics)}
  Split / Validation: {la.evaluation.train_val_test_split}
  Validation strategy: {la.evaluation.validation_strategy}
  Imbalance strategy: {la.evaluation.imbalance_strategy or 'Not applicable for this paradigm'}

METHODS / ALGORITHMS (with justifications):
{algo_justifications}

XAI TECHNIQUES:
{', '.join(la.xai_techniques) if la.xai_techniques else 'Not applicable'}
{paradigm_extras}
ETHICS STATEMENT (DROP THIS IN — do not rewrite or summarise):
{la.ethics.statement}
Population bias note: {la.ethics.population_bias_note or 'Acknowledge relevant limitations of data source'}

CITATION POOL for method citations:
{_build_citation_pool_text(locked)}

══ USE THE CHECKLIST FROM YOUR INSTRUCTIONS FOR PARADIGM: {paradigm_val} ══
The validation layer checks the paradigm-appropriate items — not the ML checklist.
Missing any hard item = validation failure.

No bullet points in final output — academic prose with subsection headers.
"""
    else:
        lb: LockedRequirementsB = locked  # type: ignore
        return f"""
TASK: Write the "Methodology" section.

RESEARCH TOPIC: {locked.research_topic}
TRACK: B (theoretical/humanities)
PARADIGM: theoretical
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
        baseline_info = _safe_baseline_text_for_abstract(la)
        xai_info = f"XAI: {', '.join(la.xai_techniques)}" if la.xai_techniques else ""
        dataset_name = la.confirmed_dataset.name
        paradigm_val = la.paradigm.value if hasattr(la, 'paradigm') else ResearchParadigm.ML_CLASSIFICATION.value
    else:
        baseline_info = "Theoretical project — no quantitative baseline"
        xai_info = ""
        dataset_name = "theoretical sources"
        paradigm_val = "theoretical"

    return f"""
TASK: Write the "Abstract" section.
This is the LAST section to write — you now have all other sections to draw from.

WORD TARGET: EXACTLY {section_target} words (±15 words acceptable)
RESEARCH TOPIC: {locked.research_topic}
TRACK: {locked.track}
PARADIGM: {paradigm_val}

LOCKED FACTS TO INCLUDE:
{baseline_info}
{xai_info}
Dataset / Sources: {dataset_name}

COMPLETED SECTIONS (draw from these — do not invent new content):
JUSTIFICATION (first 300 chars): {all_sections.get('justification', '')[:300]}...
OBJECTIVES (first 300 chars): {all_sections.get('objectives', '')[:300]}...
METHODOLOGY (first 300 chars): {all_sections.get('methodology', '')[:300]}...

MANDATORY STRUCTURE (4 elements):
1. The research problem and why it matters (1-2 sentences)
2. The specific gap in existing knowledge this project fills (1 sentence, specific)
3. What this project will do — methods, techniques, named specifically (2-3 sentences)
4. What the project expects to FIND or CONTRIBUTE — not just what it will DO (1-2 sentences)
   For ML projects: include target metric with baseline reference (if baseline confirmed)
   For econometric: state the causal relationship to be established
   For survey: state the construct relationships to be validated
   For systems: state the system to be delivered and its success criterion
   For Track B: state the argument and its contribution to the scholarly debate

PROHIBITED:
- "cutting-edge techniques", "substantial improvements"
- "reducing morbidity/mortality" (clinical overreach)
- Performance targets with no named baseline
- Saying what the project will do without saying what it expects to find
- Citing specific papers in an abstract
- Going over {section_target + 15} words or under {section_target - 15} words
"""


# ─── Main workflow function — UPDATED (agent_model_config param added) ────────

def _revision_addendum(section_key: str, previous_sections, section_feedback) -> str:
    """
    Build the revision context appended to a specialist prompt on iteration 2+.
    Gives the writer its previous version plus the reviewer's feedback so it
    revises the section instead of regenerating blind.
    """
    if not previous_sections:
        return ""
    parts = []
    prev = previous_sections.get(section_key)
    if prev:
        parts.append(f"YOUR PREVIOUS VERSION OF THIS SECTION:\n{prev}")
    fb = (section_feedback or {}).get(section_key)
    if fb:
        parts.append(f"REVIEWER FEEDBACK ON THIS SECTION — address every point:\n{fb}")
    if not parts:
        return ""
    return (
        "\n\n=== REVISION CONTEXT ===\n"
        "You are REVISING this section, not writing it from scratch. Keep what "
        "already works, fix everything the reviewer flagged, and meet the word "
        "count requirement.\n\n" + "\n\n".join(parts)
    )


async def generate_specification_sections(
    research_topic: str,
    guidelines: ProjectGuidelines,
    synthesis: StrategicSynthesis,
    locked: LockedRequirements,
    agent_model_config=None,   # NEW — Optional[AgentModelConfig]
    previous_sections: dict | None = None,
    sections_to_regenerate: set | None = None,
    section_feedback: dict | None = None,
) -> dict:
    """
    Generate all specification sections using individual specialist agents.
    Each specialist receives a focused locked-context prompt.
    Returns dict of section_name → content string.

    agent_model_config: when present, tier-aware agents are built via
      build_phase3_agents() and used instead of the module-level singletons.
      When None, all existing behaviour is unchanged.

    Targeted regeneration (iteration 2+ of the review loop):
      previous_sections:      section_key → content from the previous iteration.
                              When None, all 7 sections are generated (iteration 1).
      sections_to_regenerate: section keys the reviewer failed — only these are
                              rewritten; the rest are kept verbatim.
      section_feedback:       section_key → reviewer feedback text, injected into
                              the rewritten sections' prompts.
      References and Abstract aggregate the other sections, so they are always
      regenerated whenever any content section changed.
    """

    print("\n📝 GENERATING SPECIFICATION SECTIONS (individual specialists)")
    print("-" * 80)

    # ── NEW: resolve which agents to use ─────────────────────────────────────
    # When agent_model_config is present, build tier-aware agents.
    # Local names shadow the module-level imports for the rest of this function.
    # When None, the module-level singletons imported at the top are used as-is.
    _justification_specialist = justification_specialist
    _objectives_architect     = objectives_architect
    _literature_strategist    = literature_strategist
    _methodology_designer     = methodology_designer
    _timeline_validator       = timeline_validator
    _references_compiler      = references_compiler
    _abstract_specialist      = abstract_specialist

    if agent_model_config is not None:
        # No try/except here: a user paying for a model tier must get it or see
        # the failure — silently downgrading to defaults was Bug #2.
        from app.core.agents.definitions.phase3_agents import build_phase3_agents
        from app.models.agent_config import AgentKey

        _agents = build_phase3_agents(agent_model_config)
        _justification_specialist = _agents["justification_specialist"]
        _objectives_architect     = _agents["objectives_architect"]
        _literature_strategist    = _agents["literature_strategist"]
        _methodology_designer     = _agents["methodology_designer"]
        _timeline_validator       = _agents["timeline_validator"]
        _references_compiler      = _agents["references_compiler"]
        _abstract_specialist      = _agents["abstract_specialist"]
        print(f"   🤖 Phase 3 model: {agent_model_config.get(AgentKey.JUSTIFICATION_SPECIALIST)}")
    # ─────────────────────────────────────────────────────────────────────────

    # ── Targeted-regeneration bookkeeping ─────────────────────────────────────
    regen_all    = previous_sections is None
    to_regen     = set(sections_to_regenerate or [])
    content_keys = ["justification", "objectives", "literature_review", "methodology", "work_plan"]

    def _writes(key: str) -> bool:
        return regen_all or key in to_regen

    # References and Abstract summarise/cite the content sections — stale copies
    # would contradict rewritten content, so they follow any content change.
    content_changed  = regen_all or any(k in to_regen for k in content_keys)
    regen_references = _writes("references") or content_changed
    regen_abstract   = _writes("abstract") or content_changed

    sections: dict = {} if regen_all else dict(previous_sections)

    if not regen_all:
        kept = [k for k in content_keys if not _writes(k)]
        print(f"   🎯 Targeted regeneration — rewriting: {sorted(to_regen)}")
        print(f"      keeping approved sections: {kept}")

    # ── 1. Justification & Aim ────────────────────────────────────────────────
    if _writes("justification"):
        print("   [1/7] Justification & Aim...")
        try:
            result = await Runner.run(
                starting_agent=_justification_specialist,
                input=_justification_context(locked, guidelines)
                + _revision_addendum("justification", previous_sections, section_feedback),
            )
            sections["justification"] = str(result.final_output)
            wc = len(sections["justification"].split())
            print(f"   ✅ Justification: {wc} words")
        except Exception as exc:
            print(f"   ❌ Justification failed: {exc}")
            raise
    else:
        print("   [1/7] Justification & Aim — kept (passed review)")

    # ── 2. Objectives ─────────────────────────────────────────────────────────
    if _writes("objectives"):
        print("   [2/7] Objectives...")
        try:
            result = await Runner.run(
                starting_agent=_objectives_architect,
                input=_objectives_context(locked, guidelines, sections["justification"])
                + _revision_addendum("objectives", previous_sections, section_feedback),
            )
            sections["objectives"] = str(result.final_output)
            wc = len(sections["objectives"].split())
            print(f"   ✅ Objectives: {wc} words")
        except Exception as exc:
            print(f"   ❌ Objectives failed: {exc}")
            raise
    else:
        print("   [2/7] Objectives — kept (passed review)")

    # ── 3. Literature Review ──────────────────────────────────────────────────
    if _writes("literature_review"):
        print("   [3/7] Literature Review...")
        try:
            result = await Runner.run(
                starting_agent=_literature_strategist,
                input=_literature_context(locked, guidelines)
                + _revision_addendum("literature_review", previous_sections, section_feedback),
            )
            sections["literature_review"] = str(result.final_output)
            wc = len(sections["literature_review"].split())
            print(f"   ✅ Literature Review: {wc} words")
        except Exception as exc:
            print(f"   ❌ Literature Review failed: {exc}")
            raise
    else:
        print("   [3/7] Literature Review — kept (passed review)")

    # ── 4. Methodology ────────────────────────────────────────────────────────
    if _writes("methodology"):
        print("   [4/7] Methodology...")
        try:
            result = await Runner.run(
                starting_agent=_methodology_designer,
                input=_methodology_context(locked, guidelines)
                + _revision_addendum("methodology", previous_sections, section_feedback),
            )
            sections["methodology"] = str(result.final_output)
            wc = len(sections["methodology"].split())
            print(f"   ✅ Methodology: {wc} words")
        except Exception as exc:
            print(f"   ❌ Methodology failed: {exc}")
            raise
    else:
        print("   [4/7] Methodology — kept (passed review)")

    # ── 5. Work Plan ──────────────────────────────────────────────────────────
    if _writes("work_plan"):
        print("   [5/7] Work Plan...")
        try:
            result = await Runner.run(
                starting_agent=_timeline_validator,
                input=_timeline_context(locked, guidelines, sections["objectives"])
                + _revision_addendum("work_plan", previous_sections, section_feedback),
            )
            sections["work_plan"] = str(result.final_output)
            wc = len(sections["work_plan"].split())
            print(f"   ✅ Work Plan: {wc} words")
        except Exception as exc:
            print(f"   ❌ Work Plan failed: {exc}")
            raise
    else:
        print("   [5/7] Work Plan — kept (passed review)")

    # ── 6. References ─────────────────────────────────────────────────────────
    if regen_references:
        print("   [6/7] References...")
        all_section_text = "\n\n".join(sections[k] for k in content_keys if sections.get(k))
        try:
            result = await Runner.run(
                starting_agent=_references_compiler,
                input=_references_context(locked, all_section_text),
            )
            sections["references"] = str(result.final_output)
            ref_count = len([l for l in sections["references"].split("\n") if l.strip()])
            print(f"   ✅ References: {ref_count} entries")
        except Exception as exc:
            print(f"   ❌ References failed: {exc}")
            raise
    else:
        print("   [6/7] References — kept (no content changes)")

    # ── 7. Abstract (must be last) ────────────────────────────────────────────
    if regen_abstract:
        print("   [7/7] Abstract (last)...")
        try:
            result = await Runner.run(
                starting_agent=_abstract_specialist,
                input=_abstract_context(locked, guidelines, sections)
                + _revision_addendum("abstract", previous_sections, section_feedback),
            )
            sections["abstract"] = str(result.final_output)
            wc = len(sections["abstract"].split())
            print(f"   ✅ Abstract: {wc} words")
        except Exception as exc:
            print(f"   ❌ Abstract failed: {exc}")
            raise
    else:
        print("   [7/7] Abstract — kept (no content changes)")

    total = sum(len(v.split()) for k, v in sections.items() if k != "references")
    print(f"\n✅ All sections generated — total: {total} words")

    return sections