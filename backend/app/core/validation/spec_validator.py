"""
SpecValidationLayer

Pure Python. No AI. No guessing. No impressions.
Produces objective facts BEFORE the professor reviewer runs.
The reviewer cannot award passing marks if this layer reports blockers.

Track A checklist:  9 items
Track B checklist:  6 items
Universal checks:   word count + citation count apply to both tracks
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.models.specification import ProjectSpecification


# ─── Harvard in-text citation regex ──────────────────────────────────────────
# Matches: (Author, 2024) | (Author et al., 2024) | (Author and Author, 2024)
_HARVARD_INTEXT = re.compile(
    r'\([A-Z][a-zA-Zé\-]+(?: et al\.|(?:\s+and\s+[A-Z][a-zA-Zé\-]+)?)'
    r',\s*(?:19|20)\d{2}[a-z]?\)',
    re.UNICODE
)

# Matches timeline mentions in months (a failure signal)
_MONTH_TIMELINE = re.compile(
    r'\b\d+\s*(?:months?|month-long)\b',
    re.IGNORECASE
)

# Matches explicit week mentions (a pass signal)
_WEEK_TIMELINE = re.compile(
    r'\bweek(?:s)?\s*\d+|\bweeks?\s+\d+[-–]\d+|\b\d+[-–]\d+\s*week',
    re.IGNORECASE
)


# ─── Result objects ───────────────────────────────────────────────────────────

@dataclass
class SectionWordCount:
    section: str
    actual: int
    minimum: int
    passes: bool
    percentage: float


@dataclass
class ValidationReport:
    # ── Universal ──
    word_counts: Dict[str, SectionWordCount] = field(default_factory=dict)
    total_word_count: int = 0
    total_word_target: int = 0
    word_count_passes: bool = False

    intext_citations_found: int = 0
    intext_citations_passes: bool = False   # minimum 15

    references_count: int = 0

    # ── Track A checklist ──
    track_a_checklist: Dict[str, bool] = field(default_factory=dict)
    # Keys:
    #   named_dataset          - specific dataset named in methodology
    #   train_test_split       - explicit split percentages stated
    #   metrics_beyond_accuracy - AUC-ROC / F1 / sensitivity present
    #   ethics_statement       - ethics paragraph present in methodology
    #   timeline_in_weeks      - work plan uses weeks not months
    #   named_baseline         - a specific paper + figure named as baseline
    #   xai_technique_named    - SHAP or LIME explicitly named (if XAI claimed)
    #   no_month_timeline      - no "X months" appears in work plan
    #   no_marketing_language  - no "cutting-edge", "substantial improvements" etc.

    # ── Track B checklist ──
    track_b_checklist: Dict[str, bool] = field(default_factory=dict)
    # Keys:
    #   theoretical_framework_named
    #   primary_sources_mentioned
    #   positionality_or_ethics
    #   timeline_in_weeks
    #   no_month_timeline
    #   no_algorithm_content   - no ML/algorithm language in a humanities spec

    # ── Blocker summary ──
    blockers: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    passes_all: bool = False

    # ── Track ──
    track: str = "A"


# ─── Marketing language patterns ─────────────────────────────────────────────

_MARKETING_PHRASES = [
    "cutting-edge",
    "cutting edge",
    "substantial improvements",
    "state-of-the-art techniques",          # vague — ok if specific name follows
    "revolutionary",
    "groundbreaking",
    "morbidity",                            # clinical overreach for student project
    "mortality rate",                       # same
    "clinical deployment",
    "will be deployed",
    "reducing heart disease",
    "saving lives",
]

_ALGORITHM_TERMS = [
    "machine learning",
    "neural network",
    "random forest",
    "logistic regression",
    "support vector",
    "train/test",
    "training set",
    "dataset",
    "accuracy",
    "f1 score",
    "auc-roc",
]


def _word_count(text: str) -> int:
    return len(text.split())


def _count_intext_citations(text: str) -> int:
    return len(_HARVARD_INTEXT.findall(text))


def _full_spec_text(spec: ProjectSpecification) -> str:
    parts = [
        spec.abstract.content,
        spec.justification_and_aim.content,
        spec.objectives.content,
        spec.literature_review.content,
        spec.methodology.content,
        spec.work_plan.content,
    ]
    return "\n\n".join(parts)


# ─── Public API ───────────────────────────────────────────────────────────────

def validate_specification(
    spec: ProjectSpecification,
    section_word_targets: Dict[str, int],
    track: str = "A",
    xai_claimed: bool = False,
) -> ValidationReport:
    """
    Run all objective checks and return a ValidationReport.

    Args:
        spec:                 Generated specification object
        section_word_targets: {section_name: minimum_word_count} from guidelines
        track:                "A" or "B"
        xai_claimed:          Whether the spec claims XAI / interpretability

    Returns:
        ValidationReport with all counts, checklist results, and blocker list
    """
    report = ValidationReport(track=track)

    # ── 1. Word counts per section ────────────────────────────────────────────
    sections_map = {
        "Abstract":                  spec.abstract,
        "Justification and Aim":     spec.justification_and_aim,
        "Objectives":                spec.objectives,
        "Literature Review":         spec.literature_review,
        "Methodology":               spec.methodology,
        "Work Plan":                 spec.work_plan,
    }

    for name, section in sections_map.items():
        actual   = _word_count(section.content)
        minimum  = section_word_targets.get(name, 200)
        pct      = round((actual / minimum) * 100, 1) if minimum else 100.0
        passes   = actual >= int(minimum * 0.80)       # 80% floor is passing
        report.word_counts[name] = SectionWordCount(
            section=name,
            actual=actual,
            minimum=minimum,
            passes=passes,
            percentage=pct,
        )
        if not passes:
            report.blockers.append(
                f"WORD COUNT FAIL — {name}: {actual} words "
                f"({pct}% of required {minimum})"
            )

    report.total_word_count  = sum(s.actual for s in report.word_counts.values())
    report.total_word_target = sum(section_word_targets.values()) if section_word_targets else 3000
    report.word_count_passes = all(s.passes for s in report.word_counts.values())

    # ── 2. In-text citations ──────────────────────────────────────────────────
    full_text = _full_spec_text(spec)
    report.intext_citations_found = _count_intext_citations(full_text)
    report.references_count = len(spec.references)

    min_citations = 15
    report.intext_citations_passes = report.intext_citations_found >= min_citations
    if not report.intext_citations_passes:
        report.blockers.append(
            f"CITATION FAIL — {report.intext_citations_found} in-text citations found; "
            f"minimum {min_citations} required (Harvard format: Author, YYYY)"
        )

    # ── 3. Track A checklist ──────────────────────────────────────────────────
    if track == "A":
        methodology_text = spec.methodology.content.lower()
        work_plan_text   = spec.work_plan.content.lower()
        all_text         = full_text.lower()

        checklist = {}

        # Named dataset
        dataset_signals = [
            "uci", "kaggle", "dataset", "csv", "records", "samples",
            "collected from", "obtained from"
        ]
        checklist["named_dataset"] = any(s in methodology_text for s in dataset_signals)

        # Train/test split
        split_signals = ["%", "split", "train", "test", "fold", "cross-valid"]
        checklist["train_test_split"] = sum(
            1 for s in split_signals if s in methodology_text
        ) >= 3

        # Metrics beyond accuracy
        advanced_metrics = ["auc", "roc", "f1", "sensitivity", "specificity",
                            "precision", "recall", "confusion matrix"]
        checklist["metrics_beyond_accuracy"] = any(m in methodology_text for m in advanced_metrics)

        # Ethics statement
        ethics_signals = ["ethic", "privacy", "anonymi", "consent", "irb",
                         "public", "licence", "license", "bias", "limitation"]
        checklist["ethics_statement"] = sum(
            1 for s in ethics_signals if s in methodology_text
        ) >= 2

        # Timeline in weeks (work plan)
        checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))

        # No month timeline
        checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

        # Named baseline with figure
        baseline_signals = re.search(
            r'(\d{1,3}\.?\d*\s*%|auc[- ]?roc\s+of\s+0\.\d+)',
            methodology_text + " " + spec.justification_and_aim.content.lower()
        )
        checklist["named_baseline"] = bool(baseline_signals)

        # XAI technique named (only required if XAI is claimed)
        if xai_claimed:
            checklist["xai_technique_named"] = (
                "shap" in all_text or "lime" in all_text
            )
        else:
            checklist["xai_technique_named"] = True  # not applicable

        # No marketing language
        marketing_found = [p for p in _MARKETING_PHRASES if p in all_text]
        checklist["no_marketing_language"] = len(marketing_found) == 0
        if marketing_found:
            report.warnings.append(
                f"MARKETING LANGUAGE found: {', '.join(marketing_found[:3])}"
            )

        report.track_a_checklist = checklist

        # Add blockers for hard failures
        hard_items = [
            "named_dataset", "train_test_split", "metrics_beyond_accuracy",
            "ethics_statement", "timeline_in_weeks", "no_month_timeline",
        ]
        for item in hard_items:
            if not checklist.get(item, False):
                report.blockers.append(
                    f"METHODOLOGY CHECKLIST FAIL — {item.replace('_', ' ').upper()}"
                )

    # ── 4. Track B checklist ──────────────────────────────────────────────────
    elif track == "B":
        methodology_text = spec.methodology.content.lower()
        work_plan_text   = spec.work_plan.content.lower()
        all_text         = full_text.lower()

        checklist = {}

        # Theoretical framework named
        framework_signals = [
            "framework", "theory", "theoretical", "lens", "approach",
            "postcolonial", "feminist", "critical discourse", "grounded theory",
            "hermeneutic", "phenomenolog", "structuralis", "deconstructi"
        ]
        checklist["theoretical_framework_named"] = any(
            s in methodology_text for s in framework_signals
        )

        # Primary sources mentioned
        checklist["primary_sources_mentioned"] = (
            "primary source" in all_text
            or "primary text" in all_text
            or "archive" in all_text
            or "manuscript" in all_text
            or "corpus" in all_text
        )

        # Positionality or ethics
        checklist["positionality_or_ethics"] = (
            "positionality" in all_text
            or "position" in methodology_text
            or "ethic" in methodology_text
            or "reflexiv" in methodology_text
        )

        # Timeline in weeks
        checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))

        # No month timeline
        checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

        # No algorithm/ML content
        algo_found = [t for t in _ALGORITHM_TERMS if t in all_text]
        checklist["no_algorithm_content"] = len(algo_found) == 0
        if algo_found:
            report.warnings.append(
                f"TRACK B CONTAMINATION — algorithm/ML terms found: "
                f"{', '.join(algo_found[:3])}. Remove for humanities spec."
            )

        report.track_b_checklist = checklist

        hard_items = [
            "theoretical_framework_named", "timeline_in_weeks", "no_month_timeline"
        ]
        for item in hard_items:
            if not checklist.get(item, False):
                report.blockers.append(
                    f"METHODOLOGY CHECKLIST FAIL — {item.replace('_', ' ').upper()}"
                )

    # ── 5. Final pass/fail ────────────────────────────────────────────────────
    report.passes_all = len(report.blockers) == 0

    return report


def format_report_for_reviewer(report: ValidationReport) -> str:
    """
    Format ValidationReport as a block the professor reviewer receives FIRST.
    The reviewer instruction states: this is ground truth, not your opinion.
    """
    lines = [
        "=" * 70,
        "SPEC VALIDATION REPORT — OBJECTIVE FACTS (ground truth, read first)",
        "=" * 70,
        "",
        f"OVERALL: {'✅ ALL CHECKS PASSED' if report.passes_all else '❌ BLOCKERS PRESENT — see below'}",
        "",
        "── WORD COUNTS ──",
    ]

    for name, wc in report.word_counts.items():
        status = "✅" if wc.passes else "❌"
        lines.append(
            f"  {status} {name}: {wc.actual} words "
            f"(minimum {wc.minimum}, at {wc.percentage}%)"
        )

    lines += [
        f"  Total: {report.total_word_count} / {report.total_word_target} words",
        "",
        "── CITATIONS ──",
        f"  {'✅' if report.intext_citations_passes else '❌'} "
        f"In-text citations found: {report.intext_citations_found} "
        f"(minimum 15 required)",
        f"  References listed: {report.references_count}",
        "",
    ]

    if report.track == "A" and report.track_a_checklist:
        lines.append("── TRACK A METHODOLOGY CHECKLIST ──")
        for item, passed in report.track_a_checklist.items():
            status = "✅" if passed else "❌"
            lines.append(f"  {status} {item.replace('_', ' ')}")
        lines.append("")

    elif report.track == "B" and report.track_b_checklist:
        lines.append("── TRACK B CHECKLIST ──")
        for item, passed in report.track_b_checklist.items():
            status = "✅" if passed else "❌"
            lines.append(f"  {status} {item.replace('_', ' ')}")
        lines.append("")

    if report.blockers:
        lines.append("── BLOCKERS (must be fixed before approval) ──")
        for b in report.blockers:
            lines.append(f"  🔴 {b}")
        lines.append("")

    if report.warnings:
        lines.append("── WARNINGS ──")
        for w in report.warnings:
            lines.append(f"  🟡 {w}")
        lines.append("")

    lines += [
        "REVIEWER INSTRUCTION:",
        "  • You cannot award a passing mark to any section with a word count blocker.",
        "  • You cannot APPROVE if intext_citations_found < 15.",
        "  • You cannot APPROVE if any methodology checklist item is a blocker.",
        "  • Your qualitative judgement operates on top of this report, not instead of it.",
        "=" * 70,
    ]

    return "\n".join(lines)
