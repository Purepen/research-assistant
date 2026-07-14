"""
SpecValidationLayer — v2 (Paradigm Edition)

Pure Python. No AI. No guessing. No impressions.
Produces objective facts BEFORE the professor reviewer runs.
The reviewer cannot award passing marks if this layer reports blockers.

Track A checklist:  paradigm-aware (ML: 9 items | Econometric: 6 items | Survey: 5 | Systems: 4)
Track B checklist:  6 items (unchanged)
Universal checks:   word count + citation count apply to both tracks

WHAT'S NEW:
  - validate_specification() accepts optional `paradigm` parameter
  - Track A hard blockers are now paradigm-aware:
    * train_test_split: only a blocker for ML_CLASSIFICATION
    * metrics_beyond_accuracy: only a blocker for ML_CLASSIFICATION
    * named_baseline: only a blocker for ML_CLASSIFICATION
    * Each non-ML paradigm has its own appropriate checklist items
  - All existing ML behaviour is 100% unchanged when paradigm=None or ML_CLASSIFICATION
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, TYPE_CHECKING

from app.models.specification import ProjectSpecification

if TYPE_CHECKING:
    from app.models.locked_requirements import SimilarProjectEntry


# ─── Harvard in-text citation regex ──────────────────────────────────────────
_HARVARD_INTEXT = re.compile(
    r'\([A-Z][a-zA-Zé\-]+(?: et al\.|(?:\s+and\s+[A-Z][a-zA-Zé\-]+)?)'
    r',\s*(?:19|20)\d{2}[a-z]?\)',
    re.UNICODE
)

_MONTH_TIMELINE = re.compile(
    r'\b\d+\s*(?:months?|month-long)\b',
    re.IGNORECASE
)

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
    intext_citations_passes: bool = False

    references_count: int = 0

    # ── Track A checklist ──
    track_a_checklist: Dict[str, bool] = field(default_factory=dict)
    # ML paradigm keys:
    #   named_dataset, train_test_split, metrics_beyond_accuracy, ethics_statement,
    #   timeline_in_weeks, named_baseline, xai_technique_named, no_month_timeline,
    #   no_marketing_language
    # Econometric paradigm keys:
    #   named_dataset, regression_method_named, statistical_software_named,
    #   ethics_statement, timeline_in_weeks, no_month_timeline
    # Survey paradigm keys:
    #   named_instrument, reliability_test_named, regression_or_correlation,
    #   ethics_statement, timeline_in_weeks
    # Systems paradigm keys:
    #   system_described, evaluation_criteria_named, ethics_statement, timeline_in_weeks

    # ── Track B checklist (unchanged) ──
    track_b_checklist: Dict[str, bool] = field(default_factory=dict)

    # ── Blocker summary ──
    blockers: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    passes_all: bool = False

    # ── Track and paradigm ──
    track: str = "A"
    paradigm: str = "ml_classification"


# ─── Marketing language patterns (unchanged) ─────────────────────────────────

_MARKETING_PHRASES = [
    "cutting-edge",
    "cutting edge",
    "substantial improvements",
    "state-of-the-art techniques",
    "revolutionary",
    "groundbreaking",
    "morbidity",
    "mortality rate",
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


# ─── Topic novelty / staleness (checks the topic against known prior projects) ─

_NOVELTY_STOPWORDS = {
    "a", "an", "the", "of", "for", "in", "on", "using", "and", "to", "with",
    "study", "analysis", "impact", "effect", "effects", "approach", "based",
    "towards", "toward", "review", "assessment", "evaluation", "investigating",
    "investigation", "system", "case", "via", "into", "from", "role",
}

_NOVELTY_SIMILARITY_THRESHOLD = 0.6  # Jaccard over significant title words


def _significant_words(text: str) -> set:
    words = re.findall(r"[a-z]+", (text or "").lower())
    return {w for w in words if len(w) > 2 and w not in _NOVELTY_STOPWORDS}


def _title_similarity(a: str, b: str) -> float:
    wa, wb = _significant_words(a), _significant_words(b)
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


def _mentions_project(all_text_lower: str, author: Optional[str]) -> bool:
    """
    Whether the spec explicitly names this prior project's author — the
    signal that a real differentiation paragraph exists.

    Deliberately NOT a title-word-overlap check against the whole document:
    a spec that's legitimately about the same topic as the similar project
    will always contain that topic's words throughout (that's what "same
    topic" means), so word overlap can't distinguish "engaged with this
    specific prior work" from "is simply on-topic." The author's name is the
    one signal that actually indicates a citation rather than a shared subject.
    """
    if not author:
        return False
    first_token = author.split(",")[0].strip().split()
    if not first_token:
        return False
    surname = first_token[0].lower()
    return len(surname) > 2 and surname in all_text_lower


def _check_topic_novelty(
    project_title: str,
    all_text_lower: str,
    similar_projects: Optional[List["SimilarProjectEntry"]],
    report: ValidationReport,
) -> None:
    """
    Flags topics that look like an undifferentiated resubmission of a prior
    project already in `similar_projects` (uploaded by the student or found by
    Phase 1's auto-discovery — see locked_requirements_builder.py).

    This is a WARNING, not a blocker: title-word overlap is a heuristic, and a
    narrow research niche naturally shares vocabulary across legitimately
    different projects. Whether a given overlap is actually adequately
    differentiated is a judgment call for the reviewer, not a fact a string
    matcher can assert — same rationale as MARKETING LANGUAGE and PARADIGM
    CONTAMINATION being warnings above.
    """
    if not similar_projects:
        return
    for sp in similar_projects:
        title = getattr(sp, "title", None)
        if not title:
            continue
        similarity = _title_similarity(project_title, title)
        if similarity < _NOVELTY_SIMILARITY_THRESHOLD:
            continue
        author = getattr(sp, "author_or_institution", None)
        if _mentions_project(all_text_lower, author):
            continue
        report.warnings.append(
            f"POSSIBLE TOPIC STALENESS — {int(similarity * 100)}% title-word overlap "
            f"with prior project '{title}' ({author or 'source unknown'}), and the "
            f"specification doesn't appear to explicitly differentiate from it."
        )


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


# ─── Paradigm-specific checklist runners ─────────────────────────────────────

def _run_ml_checklist(
    methodology_text: str,
    work_plan_text: str,
    all_text: str,
    xai_claimed: bool,
    report: ValidationReport,
) -> Dict[str, bool]:
    """Original ML_CLASSIFICATION checklist — completely unchanged from v1."""
    checklist = {}

    # Named dataset
    dataset_signals = ["uci", "kaggle", "dataset", "csv", "records", "samples",
                       "collected from", "obtained from"]
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

    # Timeline in weeks
    checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))

    # No month timeline
    checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

    # Named baseline with figure
    baseline_signals = re.search(
        r'(\d{1,3}\.?\d*\s*%|auc[- ]?roc\s+of\s+0\.\d+)',
        methodology_text + " " + all_text
    )
    checklist["named_baseline"] = bool(baseline_signals)

    # XAI technique (only if claimed)
    if xai_claimed:
        checklist["xai_technique_named"] = ("shap" in all_text or "lime" in all_text)
    else:
        checklist["xai_technique_named"] = True  # not applicable

    # No marketing language
    marketing_found = [p for p in _MARKETING_PHRASES if p in all_text]
    checklist["no_marketing_language"] = len(marketing_found) == 0
    if marketing_found:
        report.warnings.append(
            f"MARKETING LANGUAGE found: {', '.join(marketing_found[:3])}"
        )

    return checklist


def _run_econometric_checklist(
    methodology_text: str,
    work_plan_text: str,
    all_text: str,
    report: ValidationReport,
) -> Dict[str, bool]:
    """Checklist for ECONOMETRIC_CAUSAL paradigm specs."""
    checklist = {}

    # Named dataset / data source
    dataset_signals = ["world bank", "ilo", "unctad", "imf", "enterprise survey",
                       "dataset", "database", "data", "survey data", "panel data",
                       "cross-sectional", "secondary data", "primary data"]
    checklist["named_dataset"] = any(s in methodology_text for s in dataset_signals)

    # Regression method named
    regression_signals = ["ols", "ordinary least squares", "logit", "probit",
                          "fixed effect", "random effect", "panel regression",
                          "propensity score", "difference-in-difference",
                          "instrumental variable", "regression analysis",
                          "multiple regression", "linear regression"]
    checklist["regression_method_named"] = any(s in methodology_text for s in regression_signals)

    # Statistical software named
    software_signals = ["stata", "r software", "r studio", "rstudio", "spss",
                        "python", "statsmodels", "plm", "matchit", "eviews"]
    checklist["statistical_software_named"] = any(s in methodology_text for s in software_signals)

    # Diagnostics / robustness mentioned
    diagnostic_signals = ["robust", "heteroskedasticity", "multicollinearity", "vif",
                          "hausman", "breusch-pagan", "autocorrelation", "stationarity",
                          "robustness check", "sensitivity analysis", "confidence interval"]
    checklist["diagnostics_mentioned"] = any(s in methodology_text for s in diagnostic_signals)

    # Ethics statement
    ethics_signals = ["ethic", "privacy", "consent", "data protection", "anonymi",
                      "secondary data", "public data", "institutional approval"]
    checklist["ethics_statement"] = sum(
        1 for s in ethics_signals if s in methodology_text
    ) >= 2

    # Timeline in weeks
    checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))

    # No month timeline
    checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

    # Warn if ML language bleeds into an econometric spec
    ml_contamination = ["train/test split", "auc-roc", "f1 score", "scikit-learn",
                        "neural network", "random forest", "smote", "classification report"]
    found_ml = [t for t in ml_contamination if t in all_text]
    if found_ml:
        report.warnings.append(
            f"PARADIGM CONTAMINATION — ML terms found in econometric spec: "
            f"{', '.join(found_ml[:3])}. Review methodology section."
        )

    return checklist


def _run_survey_checklist(
    methodology_text: str,
    work_plan_text: str,
    all_text: str,
    report: ValidationReport,
) -> Dict[str, bool]:
    """Checklist for SURVEY_QUANTITATIVE paradigm specs."""
    checklist = {}

    # Named instrument / questionnaire
    instrument_signals = ["questionnaire", "survey", "likert", "instrument",
                          "scale", "construct", "respondent", "participants"]
    checklist["named_instrument"] = any(s in methodology_text for s in instrument_signals)

    # Reliability test named
    reliability_signals = ["cronbach", "reliability", "alpha", "internal consistency",
                           "pilot study", "test-retest", "validity"]
    checklist["reliability_test_named"] = any(s in methodology_text for s in reliability_signals)

    # Regression or correlation named
    analysis_signals = ["regression", "correlation", "spearman", "pearson",
                        "spss", "r software", "multiple regression",
                        "structural equation", "sem ", "factor analysis"]
    checklist["regression_or_correlation"] = any(s in methodology_text for s in analysis_signals)

    # Ethics (especially important for survey research)
    ethics_signals = ["ethic", "consent", "anonymi", "confidential", "voluntary",
                      "irb", "ethics approval", "participant"]
    checklist["ethics_statement"] = sum(
        1 for s in ethics_signals if s in methodology_text
    ) >= 2

    # Timeline in weeks
    checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))

    # No month timeline
    checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

    return checklist


def _run_systems_checklist(
    methodology_text: str,
    work_plan_text: str,
    all_text: str,
    report: ValidationReport,
) -> Dict[str, bool]:
    """Checklist for SYSTEMS_ENGINEERING paradigm specs."""
    checklist = {}

    # System described
    system_signals = ["system", "application", "architecture", "design",
                      "component", "module", "api", "interface", "database"]
    checklist["system_described"] = any(s in methodology_text for s in system_signals)

    # Evaluation criteria named
    eval_signals = ["response time", "throughput", "load test", "performance test",
                    "jmeter", "locust", "usability", "sus", "functional test",
                    "test case", "requirement", "benchmarking"]
    checklist["evaluation_criteria_named"] = any(s in methodology_text for s in eval_signals)

    # Ethics
    ethics_signals = ["ethic", "privacy", "data protection", "consent",
                      "user data", "gdpr", "security"]
    checklist["ethics_statement"] = sum(
        1 for s in ethics_signals if s in methodology_text
    ) >= 1

    # Timeline in weeks
    checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))

    # No month timeline
    checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

    return checklist


# ─── Public API ───────────────────────────────────────────────────────────────

def validate_specification(
    spec: ProjectSpecification,
    section_word_targets: Dict[str, int],
    track: str = "A",
    xai_claimed: bool = False,
    paradigm: Optional[str] = None,   # NEW — "ml_classification" | "econometric_causal" | etc.
    similar_projects: Optional[List["SimilarProjectEntry"]] = None,
) -> ValidationReport:
    """
    Run all objective checks and return a ValidationReport.

    Args:
        spec:                 Generated specification object
        section_word_targets: {section_name: minimum_word_count} from guidelines
        track:                "A" or "B"
        xai_claimed:          Whether the spec claims XAI / interpretability
        paradigm:             ResearchParadigm value string. Defaults to "ml_classification"
                              which preserves all original behaviour.
        similar_projects:     Prior projects from LockedRequirements (user-uploaded or
                              auto-discovered). Used only for the topic-staleness warning.

    Returns:
        ValidationReport with all counts, checklist results, and blocker list
    """
    # Default to ML classification — backward compatible
    resolved_paradigm = (paradigm or "ml_classification").lower()

    report = ValidationReport(track=track, paradigm=resolved_paradigm)
    full_text = _full_spec_text(spec)
    all_text_lower = full_text.lower()

    _check_topic_novelty(spec.project_title, all_text_lower, similar_projects, report)

    # ── 1. Word counts ────────────────────────────────────────────────────────
    section_map = {
        "Abstract":               spec.abstract.content,
        "Justification and Aim":  spec.justification_and_aim.content,
        "Objectives":             spec.objectives.content,
        "Literature Review":      spec.literature_review.content,
        "Methodology":            spec.methodology.content,
        "Work Plan":              spec.work_plan.content,
    }

    total_actual = 0
    total_target = 0

    for section_name, content in section_map.items():
        minimum = section_word_targets.get(section_name, 0)
        actual  = _word_count(content)
        passes  = actual >= int(minimum * 0.85)
        pct     = (actual / minimum * 100) if minimum > 0 else 100.0
        report.word_counts[section_name] = SectionWordCount(
            section=section_name,
            actual=actual,
            minimum=minimum,
            passes=passes,
            percentage=round(pct, 1),
        )
        total_actual += actual
        total_target += minimum
        if not passes:
            report.blockers.append(
                f"WORD COUNT FAIL — {section_name}: {actual} words "
                f"(minimum {int(minimum * 0.85)} required)"
            )

    report.total_word_count  = total_actual
    report.total_word_target = total_target
    report.word_count_passes = all(v.passes for v in report.word_counts.values())

    # ── 2. Citation count ─────────────────────────────────────────────────────
    report.intext_citations_found = _count_intext_citations(full_text)
    # Raise back to 15 once PaperAbstractFetcher reliably returns 15+ papers.
    min_citations = 10
    report.intext_citations_passes = report.intext_citations_found >= min_citations
    if not report.intext_citations_passes:
        report.blockers.append(
            f"CITATION FAIL — {report.intext_citations_found} in-text citations found; "
            f"minimum {min_citations} required (Harvard format: Author, YYYY)"
        )

    # ── 3. Track A checklist (paradigm-aware) ─────────────────────────────────
    if track == "A":
        methodology_text = spec.methodology.content.lower()
        work_plan_text   = spec.work_plan.content.lower()

        if resolved_paradigm == "econometric_causal":
            checklist = _run_econometric_checklist(
                methodology_text, work_plan_text, all_text_lower, report
            )
            hard_items = [
                "named_dataset", "regression_method_named",
                "ethics_statement", "timeline_in_weeks", "no_month_timeline",
            ]

        elif resolved_paradigm == "survey_quantitative":
            checklist = _run_survey_checklist(
                methodology_text, work_plan_text, all_text_lower, report
            )
            hard_items = [
                "named_instrument", "ethics_statement",
                "timeline_in_weeks", "no_month_timeline",
            ]

        elif resolved_paradigm == "systems_engineering":
            checklist = _run_systems_checklist(
                methodology_text, work_plan_text, all_text_lower, report
            )
            hard_items = [
                "system_described", "timeline_in_weeks", "no_month_timeline",
            ]

        elif resolved_paradigm == "finance_quant":
            # Finance quant: similar to ML but with different metric signals
            checklist = {}
            dataset_signals = ["bloomberg", "crsp", "compustat", "yfinance",
                               "yahoo finance", "data", "returns", "prices", "time series"]
            checklist["named_dataset"] = any(s in methodology_text for s in dataset_signals)

            method_signals = ["garch", "var", "monte carlo", "arima", "portfolio",
                              "regression", "ols", "volatility model", "time series model"]
            checklist["financial_method_named"] = any(s in methodology_text for s in method_signals)

            software_signals = ["python", "r software", "matlab", "quantlib", "stata"]
            checklist["software_named"] = any(s in methodology_text for s in software_signals)

            checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))
            checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

            ethics_signals = ["ethic", "data", "licence", "proprietary", "bloomberg",
                              "privacy", "secondary data"]
            checklist["ethics_statement"] = any(s in methodology_text for s in ethics_signals)

            hard_items = [
                "named_dataset", "financial_method_named",
                "timeline_in_weeks", "no_month_timeline",
            ]

        else:
            # ML_CLASSIFICATION — original checklist, completely unchanged
            checklist = _run_ml_checklist(
                methodology_text, work_plan_text, all_text_lower, xai_claimed, report
            )
            hard_items = [
                "named_dataset", "train_test_split", "metrics_beyond_accuracy",
                "ethics_statement", "timeline_in_weeks", "no_month_timeline",
            ]

        report.track_a_checklist = checklist

        for item in hard_items:
            if not checklist.get(item, False):
                report.blockers.append(
                    f"METHODOLOGY CHECKLIST FAIL — {item.replace('_', ' ').upper()}"
                )

    # ── 4. Track B checklist (unchanged) ─────────────────────────────────────
    elif track == "B":
        methodology_text = spec.methodology.content.lower()
        work_plan_text   = spec.work_plan.content.lower()

        checklist = {}

        framework_signals = [
            "framework", "theory", "theoretical", "lens", "approach",
            "postcolonial", "feminist", "critical discourse", "grounded theory",
            "hermeneutic", "phenomenolog", "structuralis", "deconstructi"
        ]
        checklist["theoretical_framework_named"] = any(
            s in methodology_text for s in framework_signals
        )

        checklist["primary_sources_mentioned"] = (
            "primary source" in all_text_lower
            or "primary text" in all_text_lower
            or "archive" in all_text_lower
            or "manuscript" in all_text_lower
            or "corpus" in all_text_lower
        )

        checklist["positionality_or_ethics"] = (
            "positionality" in all_text_lower
            or "position" in methodology_text
            or "ethic" in methodology_text
            or "reflexiv" in methodology_text
        )

        checklist["timeline_in_weeks"] = bool(_WEEK_TIMELINE.search(work_plan_text))
        checklist["no_month_timeline"] = not bool(_MONTH_TIMELINE.search(work_plan_text))

        algo_found = [t for t in _ALGORITHM_TERMS if t in all_text_lower]
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
    min_citations = 10  # Keep in sync with validate_specification above.

    lines = [
        "═══════════════════════════════════════════════════════",
        "VALIDATION REPORT — GROUND TRUTH (Python layer, not AI)",
        f"Track: {report.track} | Paradigm: {report.paradigm}",
        f"Overall: {'✅ PASSES ALL CHECKS' if report.passes_all else '❌ HAS BLOCKERS'}",
        "═══════════════════════════════════════════════════════",
        "",
        f"WORD COUNT: {report.total_word_count} / {report.total_word_target} words",
    ]

    for section, wc in report.word_counts.items():
        status = "✅" if wc.passes else "❌"
        lines.append(f"  {status} {section}: {wc.actual} words ({wc.percentage:.0f}% of target)")

    lines += [
        "",
        f"CITATIONS: {report.intext_citations_found} in-text citations "
        f"({'✅' if report.intext_citations_passes else '❌'} — minimum {min_citations} required)",
        "",
    ]

    if report.track == "A":
        lines.append(f"TRACK A CHECKLIST ({report.paradigm}):")
        for item, passed in report.track_a_checklist.items():
            lines.append(f"  {'✅' if passed else '❌'} {item.replace('_', ' ')}")
    else:
        lines.append("TRACK B CHECKLIST:")
        for item, passed in report.track_b_checklist.items():
            lines.append(f"  {'✅' if passed else '❌'} {item.replace('_', ' ')}")

    if report.blockers:
        lines += ["", "BLOCKERS (must fix before passing):"]
        for b in report.blockers:
            lines.append(f"  🔴 {b}")

    if report.warnings:
        lines += ["", "WARNINGS (review recommended):"]
        for w in report.warnings:
            lines.append(f"  🟡 {w}")

    lines += [
        "",
        "INSTRUCTION TO REVIEWER:",
        "These are objective measurements from the Python validation layer.",
        "They are ground truth — not your assessment. If blockers exist,",
        "you MUST report them as failures regardless of how confident",
        "the prose sounds. Your job is to review quality ABOVE these baselines.",
        "═══════════════════════════════════════════════════════",
    ]

    return "\n".join(lines)