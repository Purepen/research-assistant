"""
Locked Requirements Models

Purpose: Single source of truth assembled BEFORE any generation agent runs.
         Every section agent reads from this object exclusively.
         No agent may introduce facts, citations, or claims not present here.

Two shapes:
  - LockedRequirementsA  →  empirical / data / technical projects (Track A)
  - LockedRequirementsB  →  theoretical / humanities / essay projects (Track B)

Track is determined at Step 1 submission by field_of_study + research_topic.

PARADIGM ADDITION (non-breaking):
  Track A now carries a ResearchParadigm that drives method selection,
  evaluation framework, and methodology instruction routing.
  Default is ML_CLASSIFICATION — all existing specs are 100% unchanged.
"""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional


# ─── Research Paradigm ────────────────────────────────────────────────────────

class ResearchParadigm(str, Enum):
    """
    The five empirical paradigms covering ~95% of all Track A dissertations.

    Defaults to ML_CLASSIFICATION — backward compatible with every existing spec.
    Detection order in locked_requirements_builder.py:
      1. Student's explicit answer to Step 3 Q4 (research_nature)
      2. Econometric terms detected in preferred_algorithms (Q3 override)
      3. detect_paradigm() — deterministic keyword matching
      4. ML_CLASSIFICATION (final safe fallback)
    """
    ML_CLASSIFICATION    = "ml_classification"    # CS, Data Science, Health Informatics
    ECONOMETRIC_CAUSAL   = "econometric_causal"   # Economics, Finance, Accounting, Business
    SURVEY_QUANTITATIVE  = "survey_quantitative"  # Management, Education, Psychology, HR
    SYSTEMS_ENGINEERING  = "systems_engineering"  # Software Engineering, Information Systems
    FINANCE_QUANT        = "finance_quant"         # Actuarial, Quant Finance, Risk Management


# ─── Verified Paper ───────────────────────────────────────────────────────────

class VerifiedPaper(BaseModel):
    """
    A paper found via web search by PaperAbstractFetcher (title/authors/abstract/
    metric are that agent's self-report, not independently confirmed).

    doi_verified is the one field that IS independently confirmed: when a DOI is
    present, build_verified_citation_pool() checks it against CrossRef before the
    paper enters the pool. Papers whose DOI does not resolve are dropped entirely
    (see phase1_paper_fetcher.py) — a DOI that fails resolution is worse than no
    DOI. doi_verified=False + doi=None means the paper is genuinely DOI-less
    (e.g. a conference abstract); doi_verified=False + doi set means CrossRef was
    unreachable, not that the DOI is wrong.
    """
    title: str
    authors: str                      # e.g. "Mohan, S., Thirumalai, C. and Srivastava, G."
    year: int
    doi: Optional[str] = None         # None only if genuinely DOI-less (conference abs)
    doi_verified: bool = False        # True only after a successful CrossRef resolution
    source_url: str                   # URL that was fetched
    abstract_snippet: str             # First 500 chars of abstract
    key_metric: Optional[str] = None  # e.g. "AUC-ROC", "F1", "Accuracy"
    key_metric_value: Optional[str] = None  # e.g. "0.91", "87.4%"
    harvard_citation: str             # Pre-formatted Cite Them Right Harvard string
    is_baseline_candidate: bool = False


# ─── Confirmed Dataset ────────────────────────────────────────────────────────

class LockedDataset(BaseModel):
    """Dataset confirmed by the student. Profile fields are populated from the
    real uploaded file by DatasetProfiler — never invented by agents."""
    name: str
    source: str             # "UCI", "Kaggle", "user_uploaded", "self_collected"
    access_url: Optional[str] = None
    description: str
    size: Optional[str] = None
    is_public: bool = True
    harvard_citation: str   # Pre-formatted dataset citation

    # ── Real profile (populated by dataset_profiler.py) ───────────────────
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    column_names: List[str] = Field(default_factory=list)
    column_dtypes: dict = Field(
        default_factory=dict,
        description="col_name → dtype string (integer/float/categorical/binary/text)"
    )
    missing_value_summary: Optional[str] = None   # e.g. "trestbps: 2.1% missing"
    duplicate_rows: Optional[int] = None
    data_quality_notes: Optional[str] = None
    full_profile_text: Optional[str] = None       # Full _build_summary() output for agents
    profiled: bool = False                        # True only when real file was read


# ─── Named Baseline ───────────────────────────────────────────────────────────

class LockedBaseline(BaseModel):
    """
    The single named benchmark this project is measured against.
    Every agent that mentions performance targets reads this — no exceptions.
    """
    paper_title: str
    authors: str
    year: int
    metric_name: str         # e.g. "Accuracy", "AUC-ROC"
    metric_value: str        # e.g. "87.4%", "0.91"
    harvard_citation: str
    target_to_beat: str      # e.g. "minimum 92% accuracy or 5-point AUC-ROC improvement"


# ─── Similar Project Entry ────────────────────────────────────────────────────

class SimilarProjectEntry(BaseModel):
    """
    A real past project used for explicit differentiation in Justification.
    JustificationSpecialist must name and critique at least 2 of these.
    """
    title: str
    author_or_institution: str
    year: Optional[int] = None
    level: str               # "BSc", "MSc", "PhD"
    approach_summary: str    # What they did
    limitation: str          # What they did NOT do — the gap this project fills


# ─── Evaluation Framework ─────────────────────────────────────────────────────

class EvaluationFramework(BaseModel):
    """
    Explicitly defined metrics for Track A projects.
    Fields are interpreted differently per paradigm — the methodology agent
    receives the paradigm label and knows what each field means in context.
    """
    primary_metric: str                    # ML: "AUC-ROC" | Econ: "Coefficient significance (p<0.05) and R²"
    additional_metrics: List[str]          # ML: ["F1","Sensitivity"] | Econ: ["VIF","Hausman test"]
    validation_strategy: str               # ML: "10-fold CV" | Econ: "Robustness checks + sub-group analysis"
    train_val_test_split: str              # ML: "70/15/15" | Econ: "Not applicable — full dataset estimation"
    imbalance_strategy: Optional[str] = None  # ML only: "SMOTE (Chawla et al., 2002)" | None for other paradigms


# ─── Ethics Statement ─────────────────────────────────────────────────────────

class EthicsStatement(BaseModel):
    """
    Ethics POLICY FACTS, locked in before the methodology agent runs.

    irb_required is a deterministic compliance decision (correct by construction
    from data_sensitivity) and must never be left to LLM judgment. `statement` is
    a short factual brief, not finished prose — the methodology writer composes
    the actual paragraph from it, so wording varies per project instead of being
    pasted verbatim (see phase3_workflow.py's ETHICS CONTEXT block).
    """
    data_sensitivity: str    # "public", "self_collected", "sensitive"
    statement: str           # Factual brief — input for the writer, not verbatim prose
    irb_required: bool = False
    population_bias_note: Optional[str] = None


# ─── Track A: Empirical / Data / Technical ────────────────────────────────────

class LockedRequirementsA(BaseModel):
    """
    Locked context for Track A (CS, Engineering, Data Science, Health Informatics,
    Economics, Finance, Management, Systems, etc.)

    PARADIGM FIELD: determines which methodology template, method picker, and
    evaluation framework the agent uses. Defaults to ML_CLASSIFICATION so all
    existing behaviour is 100% preserved — no existing spec is affected.
    """
    track: str = "A"

    # ── Research paradigm ────────────────────────────────────────────────────
    # Default: ML_CLASSIFICATION — preserves all existing behaviour.
    paradigm: ResearchParadigm = ResearchParadigm.ML_CLASSIFICATION

    # Core identification
    research_topic: str
    field_of_study: str
    academic_level: str          # BSc / MSc / PhD
    timeline_weeks: int          # 15 (full-time) or 30 (part-time)

    # Citation pool — ONLY these can be cited. No fabrication allowed.
    citation_pool: List[VerifiedPaper] = Field(
        description="Verified, DOI-linked papers. Agents may ONLY cite from this pool."
    )

    # Dataset (checklist item 1)
    confirmed_dataset: LockedDataset

    # Baseline (checklist item 2)
    # Optional — None for econometric/survey/systems paradigms where ML baseline
    # concept doesn't apply. Methodology agent handles None honestly.
    baseline: Optional[LockedBaseline] = None

    # Similar projects for differentiation (used by JustificationSpecialist)
    similar_projects: List[SimilarProjectEntry] = Field(
        default_factory=list,
        description=(
            "Real past projects for explicit differentiation. "
            "May be empty if none were found — do not fabricate entries."
        )
    )

    # Evaluation framework (interpretation depends on paradigm)
    evaluation: EvaluationFramework

    # Ethics (required for all paradigms)
    ethics: EthicsStatement

    # XAI / interpretability — ML paradigm only
    xai_techniques: Optional[List[str]] = None  # e.g. ["SHAP (Lundberg & Lee, 2017)", "LIME"]

    # Methods/algorithms (interpretation depends on paradigm):
    #   ML:         ["Random Forest", "SVM", "ANN"]
    #   Econometric:["OLS Regression", "PSM", "DiD"]
    #   Survey:     ["Descriptive Statistics", "Cronbach's α", "Multiple Regression"]
    #   Systems:    ["Performance Benchmarking", "Load Testing", "SUS Usability Test"]
    #   Finance:    ["GARCH", "Monte Carlo Simulation", "VaR"]
    algorithms: List[str] = Field(
        description="Named methods with justifications. Interpretation depends on paradigm."
    )
    algorithm_justifications: dict = Field(
        default_factory=dict,
        description="method_name → why_chosen. Language appropriate to paradigm."
    )

    # Work plan structure
    work_plan_weeks: List[dict] = Field(
        description="List of {weeks: str, activity: str, deliverable: str}"
    )

    # Student's stated success definition (from Step 3 Q2)
    student_success_statement: Optional[str] = None

    # ── Paradigm-specific optional fields ────────────────────────────────────
    # These are populated by build_locked_requirements() for the relevant paradigm.
    # They are None for all other paradigms — agents only read the ones that apply.

    # ECONOMETRIC_CAUSAL
    treatment_variable: Optional[str] = None          # "impact_investment_received (binary: 1/0)"
    outcome_variable: Optional[str] = None            # "jobs_created (continuous, year-on-year)"
    control_variables: Optional[List[str]] = None     # ["firm_age", "sector", "country_gdp_growth"]
    causal_identification_strategy: Optional[str] = None  # "PSM", "DiD", "FE", "OLS with controls"
    statistical_software: Optional[str] = None        # "R (plm, MatchIt, stargazer)", "Stata"
    data_structure: Optional[str] = None              # "cross-sectional", "panel", "time-series"

    # SURVEY_QUANTITATIVE
    measurement_instrument: Optional[str] = None      # "5-point Likert scale (Strongly Disagree–Agree)"
    reliability_test: Optional[str] = None            # "Cronbach's α (target: α > 0.7)"
    sample_size_target: Optional[str] = None          # "minimum 100 respondents (G*Power α=0.05)"

    # SYSTEMS_ENGINEERING
    system_type: Optional[str] = None                 # "REST API", "web application", "mobile app"
    evaluation_environment: Optional[str] = None      # "Docker + AWS EC2 t3.medium"

    # Guidelines-derived targets
    target_word_count: int = 3000
    citation_style: str = "Harvard"
    section_word_targets: dict = Field(
        default_factory=dict,
        description="section_name → minimum word count"
    )


# ─── Track B: Theoretical / Humanities / Essay ────────────────────────────────

class LockedRequirementsB(BaseModel):
    """
    Locked context for Track B (English, Law, History, Policy, Philosophy, etc.)

    No datasets. No algorithms. No metrics.
    Framework + argument + sources + positionality.
    """
    track: str = "B"

    # Core identification
    research_topic: str
    field_of_study: str
    academic_level: str
    timeline_weeks: int

    # Citation pool
    citation_pool: List[VerifiedPaper] = Field(
        description="Verified scholarly sources. Agents may ONLY cite from this pool."
    )

    # Theoretical framework chosen by student
    theoretical_framework: str       # e.g. "Postcolonial theory (Bhabha, 1994)"
    framework_justification: str     # Why this lens fits the topic

    # Student's stated argument
    central_argument: str            # One sentence, student's own words from Step 3

    # Primary source focus
    primary_source_focus: Optional[str] = None  # e.g. "Chinua Achebe's trilogy, 1958-1964"

    # Key scholarly debates in the field
    scholarly_debates: List[str] = Field(
        description="Active debates this project engages with"
    )

    # Similar projects for differentiation
    similar_projects: List[SimilarProjectEntry] = Field(
        default_factory=list,
        description=(
            "Real past projects for explicit differentiation. "
            "May be empty if none were found — do not fabricate entries."
        )
    )

    # Positionality / ethics for humanities
    positionality_statement: Optional[str] = None

    # Work plan for theoretical project
    work_plan_weeks: List[dict] = Field(
        description="List of {weeks: str, activity: str, deliverable: str}"
    )

    # Guidelines-derived
    target_word_count: int = 3000
    citation_style: str = "Harvard"
    section_word_targets: dict = Field(default_factory=dict)